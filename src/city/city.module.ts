import { Module } from '@nestjs/common';
import { CityController } from './city.controller';
import { CityService } from './city.service';
import { PrismaModule } from "../prisma/prisma.module";
import { GeoModule } from "../geo/geo.module";

@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [CityController],
  providers: [CityService]
})
export class CityModule {}
