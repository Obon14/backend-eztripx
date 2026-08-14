import { Module } from "@nestjs/common";
import { DocumentGuideService } from "./document-guide.service";
import { DocumentGuideController } from "./document-guide.controller";
import { DocumentGuidePublicController } from "./document-guide-public.controller";
import { DocumentGuideIngestController } from "./document-guide-ingest.controller";
import { OrderModule } from "../order/order.module";
import { GeoModule } from "../geo/geo.module";

@Module({
  imports: [OrderModule, GeoModule],
  controllers: [
    DocumentGuidePublicController,
    DocumentGuideIngestController,
    DocumentGuideController,
  ],
  providers: [DocumentGuideService],
})
export class DocumentGuideModule {}
