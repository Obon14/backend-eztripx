import { Module } from "@nestjs/common";
import { GeoPublicController } from "./geo-public.controller";
import { GeoPublicService } from "./geo-public.service";

@Module({
  controllers: [GeoPublicController],
  providers: [GeoPublicService],
})
export class GeoModule {}
