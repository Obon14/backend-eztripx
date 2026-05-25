import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderWebhookController } from "./order-webhook.controller";
import { XenditWebhookGuard } from "./guard/xendit-webhook.guard";
import { XenditModule } from "../xendit/xendit.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [XenditModule, MailModule],
  controllers: [OrderController, OrderWebhookController],
  providers: [OrderService, XenditWebhookGuard],
  exports: [OrderService],
})
export class OrderModule {}
