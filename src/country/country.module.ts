import { Module } from '@nestjs/common';
import { CountryController } from './country.controller';
import { CountryService } from './country.service';
import { PrismaModule } from "../prisma/prisma.module";
import { GeoModule } from "../geo/geo.module";

@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [CountryController],
  providers: [CountryService]
})
export class CountryModule {}
