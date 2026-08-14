import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

@Injectable()
export class DocumentGuideIngestGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected =
      this.config.get<string>("DOCUMENT_GUIDE_INGEST_KEY")?.trim() ?? "";
    if (!expected) {
      throw new UnauthorizedException("Ingest API is not configured");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header("x-api-key")?.trim() ?? "";
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }
}

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
