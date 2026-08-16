import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { RegionModule } from './region/region.module';
import { CountryModule } from './country/country.module';
import { CityModule } from './city/city.module';
import { DocumentGuideModule } from './document-guide/document-guide.module';
import { OrderModule } from './order/order.module';
import { UserModule } from './user/user.module';
import { GeoModule } from './geo/geo.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 10_000,
      },
    ]),
    RegionModule,
    CountryModule,
    CityModule,
    DocumentGuideModule,
    OrderModule,
    UserModule,
    GeoModule,
    DashboardModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
