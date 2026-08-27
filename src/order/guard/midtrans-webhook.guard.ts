import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { MidtransService } from "../../midtrans/midtrans.service";

@Injectable()
export class MidtransWebhookGuard implements CanActivate {
  constructor(private readonly midtrans: MidtransService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = (req.body ?? {}) as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
    };

    if (!this.midtrans.verifyNotificationSignature(body)) {
      throw new UnauthorizedException("Invalid Midtrans notification signature");
    }

    return true;
  }
}
