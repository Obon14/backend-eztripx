import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { OrderService } from "./order.service";
import { MidtransWebhookGuard } from "./guard/midtrans-webhook.guard";

/**
 * Public endpoint for Midtrans payment notifications.
 * Configure URL in Midtrans Dashboard → Settings → Configuration:
 *   https://<your-api-host>/api/order/webhook/midtrans
 */
@Controller("order/webhook")
export class OrderWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Post("midtrans")
  @HttpCode(200)
  @UseGuards(MidtransWebhookGuard)
  handleMidtransNotification(@Body() body: Record<string, unknown>) {
    return this.orderService.handleMidtransNotification(body);
  }
}
