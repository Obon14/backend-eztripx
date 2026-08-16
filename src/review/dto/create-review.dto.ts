import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ErrorMessages } from "../../common/constants/message.constants";

export class CreateReviewDto {
  @IsUUID()
  documentGuideId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: ErrorMessages.REVIEW_INVALID_RATING })
  @Max(5, { message: ErrorMessages.REVIEW_INVALID_RATING })
  rating: number;

  @IsString()
  @IsNotEmpty({ message: ErrorMessages.REVIEW_COMMENT_REQUIRED })
  @MinLength(10, { message: ErrorMessages.REVIEW_COMMENT_REQUIRED })
  @MaxLength(1000)
  comment: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  travelerRole?: string;
}
