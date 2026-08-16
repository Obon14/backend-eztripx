import { Controller, Get } from "@nestjs/common";
import { ReviewService } from "./review.service";

@Controller("review/public")
export class ReviewPublicController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findPublished() {
    return this.reviewService.findPublished();
  }
}
