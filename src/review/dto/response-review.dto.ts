import { ReviewStatus } from "../../../generated/prisma/client";

export class ResponsePublicReviewDto {
  id: string;
  rating: number;
  comment: string;
  displayName: string;
  travelerRole: string | null;

  constructor(row: {
    id: string;
    rating: number;
    comment: string;
    displayName: string;
    travelerRole: string | null;
  }) {
    this.id = row.id;
    this.rating = row.rating;
    this.comment = row.comment;
    this.displayName = row.displayName;
    this.travelerRole = row.travelerRole;
  }
}

export class ResponseReviewDto extends ResponsePublicReviewDto {
  status: ReviewStatus;
  documentGuideId: string;
  createdAt: Date;
  userEmail?: string;
  guideTitle?: string;

  constructor(row: {
    id: string;
    rating: number;
    comment: string;
    displayName: string;
    travelerRole: string | null;
    status: ReviewStatus;
    documentGuideId: string;
    createdAt: Date;
    user?: { email: string };
    documentGuide?: { titleId: string };
  }) {
    super(row);
    this.status = row.status;
    this.documentGuideId = row.documentGuideId;
    this.createdAt = row.createdAt;
    this.userEmail = row.user?.email;
    this.guideTitle = row.documentGuide?.titleId;
  }
}
