import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RegisterDto } from "./dto/register.dto";
import { ErrorMessages } from "../common/constants/message.constants";
import { Role } from "../../generated/prisma/client";
import * as bcrypt from "bcrypt";
import { RegisterResponseDto } from "./dto/register-response.dto";
import { plainToInstance } from "class-transformer";
import { LoginDto } from "./dto/login.dto";


interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_DB_TTL_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(req: RegisterDto) {
    const email = await this.findUserByEmail(req.email);

    if (email) throw new ConflictException(ErrorMessages.EMAIL_ALREADY_EXISTS);

    const hashPassword = await bcrypt.hash(req.password, 12);

    const newUser = await this.prisma.user.create({
      data: {
        email: req.email,
        password: hashPassword,
        role: Role.USER,
      },
    });
    return plainToInstance(RegisterResponseDto, newUser);
  }

  async login(req: LoginDto): Promise<AuthToken> {
    const data = await this.findUserByEmail(req.email);

    if (!data)
      throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);

    const compare = await bcrypt.compare(req.password, data.password);
    if (!compare)
      throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);

    const token = await this.generateToken({
      sub: data.id,
      email: data.email,
      role: data.role,
    });

    await this.saveRefreshToken(data.id, token.refreshToken);

    return token;
  }

  async refresh(refreshToken: string): Promise<AuthToken> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException(
        "Refresh token tidak valid atau sudah kadaluarsa",
      );
    }

    const savedToken = await this.prisma.refreshToken.findUnique({
      where: { userId: payload.sub },
    });

    if (!savedToken) {
      throw new UnauthorizedException(
        "Sesi tidak ditemukan, silakan login ulang",
      );
    }

    if (savedToken.expiredAt < new Date()) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException("Sesi habis, silakan login ulang");
    }

    const tokenMatch = await bcrypt.compare(refreshToken, savedToken.token);
    if (!tokenMatch) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException("Sesi tidak valid, silakan login ulang");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(ErrorMessages.DATA_NOT_FOUND);
    }

    const token = await this.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    await this.saveRefreshToken(user.id, token.refreshToken);

    return token;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return "success logout";
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  private async generateToken(payload: JwtPayload): Promise<AuthToken> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
        expiresIn: this.config.getOrThrow("JWT_ACCESS_EXPIRED"),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
        expiresIn: this.config.getOrThrow("JWT_REFRESH_EXPIRED"),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashRefreshToken = await bcrypt.hash(refreshToken, 12);
    const expired = new Date(Date.now() + REFRESH_TOKEN_DB_TTL_MS);

    await this.prisma.refreshToken.upsert({
      where: { userId },
      update: { token: hashRefreshToken, expiredAt: expired },
      create: { userId: userId, token: hashRefreshToken, expiredAt: expired },
    });
  }
}
