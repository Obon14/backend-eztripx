import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";
import { StreamableFile } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { GetUser } from "../common/decorators/get-user.decorator";
import { JwtGuard } from "./guard/jwt.guard";
import { AuthThrottle } from "../common/constants/throttle.constants";
import { RegisterResponseDto } from "./dto/register-response.dto";
import {
  assertAvatarFile,
  avatarMulterStorage,
} from "./avatar.storage";

@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle(AuthThrottle.register)
  register(@Body() createAuthDto: RegisterDto) {
    return this.authService.register(createAuthDto);
  }

  @Post("login")
  @Throttle(AuthThrottle.login)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @Throttle(AuthThrottle.refresh)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Get("me")
  @Throttle(AuthThrottle.authenticated)
  @UseGuards(JwtGuard)
  me(@GetUser() user: RegisterResponseDto) {
    return user;
  }

  @Get("me/avatar")
  @Throttle(AuthThrottle.authenticated)
  @UseGuards(JwtGuard)
  async avatar(
    @GetUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType } = await this.authService.getAvatar(userId);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=60");
    return new StreamableFile(stream);
  }

  @Patch("me")
  @Throttle(AuthThrottle.authenticated)
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: avatarMulterStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  updateMe(
    @GetUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    assertAvatarFile(file);
    return this.authService.updateProfile(userId, dto.displayName, file);
  }

  @Post("logout")
  @Throttle(AuthThrottle.authenticated)
  @UseGuards(JwtGuard)
  logout(@GetUser("id") userId: string) {
    return this.authService.logout(userId);
  }
}
