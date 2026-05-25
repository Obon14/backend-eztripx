import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class XenditWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const expected =
      this.config.get<string>("XENDIT_WEBHOOKS")?.trim() ||
      this.config.get<string>("XENDIT_WEBHOOK_TOKEN")?.trim();

    if (!expected) {
      throw new UnauthorizedException("Webhook verification is not configured");
    }

    const token = req.header("x-callback-token");
    if (!token || token !== expected) {
      throw new UnauthorizedException("Invalid Xendit callback token");
    }

    return true;
  }
}
