import { Module } from "@nestjs/common";
import { ReviewService } from "./review.service";
import { ReviewController } from "./review.controller";
import { ReviewPublicController } from "./review-public.controller";
import { ReviewAdminController } from "./review-admin.controller";
import { OrderModule } from "../order/order.module";

@Module({
  imports: [OrderModule],
  controllers: [
    ReviewPublicController,
    ReviewAdminController,
    ReviewController,
  ],
  providers: [ReviewService],
})
export class ReviewModule {}
