import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ReviewService } from "./review.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { GetUser } from "../common/decorators/get-user.decorator";
import { RegisterResponseDto } from "../auth/dto/register-response.dto";

@UseGuards(JwtGuard)
@Controller("review")
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  create(@GetUser() user: RegisterResponseDto, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, user.role, dto);
  }

  @Get("mine")
  findMine(
    @GetUser("id") userId: string,
    @Query("documentGuideId") documentGuideId: string,
  ) {
    return this.reviewService.findMineForGuide(userId, documentGuideId);
  }
}
