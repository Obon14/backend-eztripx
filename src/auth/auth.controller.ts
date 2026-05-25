import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { GetUser } from "../common/decorators/get-user.decorator";
import { JwtGuard } from "./guard/jwt.guard";
import { AuthThrottle } from "../common/constants/throttle.constants";
import { RegisterResponseDto } from "./dto/register-response.dto";

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

  @Post("logout")
  @Throttle(AuthThrottle.authenticated)
  @UseGuards(JwtGuard)
  logout(@GetUser("id") userId: string) {
    return this.authService.logout(userId);
  }
}
