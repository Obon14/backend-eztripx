import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderAdminController } from "./order-admin.controller";
import { OrderWebhookController } from "./order-webhook.controller";
import { MidtransWebhookGuard } from "./guard/midtrans-webhook.guard";
import { MidtransModule } from "../midtrans/midtrans.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MidtransModule, MailModule],
  controllers: [OrderAdminController, OrderController, OrderWebhookController],
  providers: [OrderService, MidtransWebhookGuard],
  exports: [OrderService],
})
export class OrderModule {}
