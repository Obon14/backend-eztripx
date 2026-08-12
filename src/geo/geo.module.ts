import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GeoCoordsService } from "./geo-coords.service";
import { GeoPublicController } from "./geo-public.controller";
import { GeoPublicService } from "./geo-public.service";

@Module({
  imports: [PrismaModule],
  controllers: [GeoPublicController],
  providers: [GeoPublicService, GeoCoordsService],
  exports: [GeoCoordsService],
})
export class GeoModule {}
