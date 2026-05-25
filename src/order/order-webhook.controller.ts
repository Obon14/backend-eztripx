import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { OrderService } from "./order.service";
import { XenditWebhookGuard } from "./guard/xendit-webhook.guard";

/**
 * Public endpoint for Xendit invoice webhooks.
 * Configure URL in Xendit Dashboard, e.g.:
 *   https://<your-api-host>/order/webhook/xendit
 */
@Controller("order/webhook")
export class OrderWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Post("xendit")
  @HttpCode(200)
  @UseGuards(XenditWebhookGuard)
  handleXenditInvoice(@Body() body: Record<string, unknown>) {
    return this.orderService.handleXenditInvoiceWebhook(body);
  }
}
