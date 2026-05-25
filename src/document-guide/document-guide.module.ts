import { Module } from "@nestjs/common";
import { DocumentGuideService } from "./document-guide.service";
import { DocumentGuideController } from "./document-guide.controller";
import { DocumentGuidePublicController } from "./document-guide-public.controller";
import { OrderModule } from "../order/order.module";

@Module({
  imports: [OrderModule],
  controllers: [DocumentGuidePublicController, DocumentGuideController],
  providers: [DocumentGuideService],
})
export class DocumentGuideModule {}
