import { IsEnum } from "class-validator";
import { ReviewStatus } from "../../../generated/prisma/client";

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}
