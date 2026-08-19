import { Module } from "@nestjs/common";
import { LegalService } from "./legal.service";
import { LegalPublicController } from "./legal-public.controller";
import { LegalAdminController } from "./legal-admin.controller";

@Module({
  controllers: [LegalPublicController, LegalAdminController],
  providers: [LegalService],
})
export class LegalModule {}
