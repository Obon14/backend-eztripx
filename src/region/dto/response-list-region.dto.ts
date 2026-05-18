export class ResponseListRegionDto {

  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseListRegionDto>) {
    Object.assign(this, partial);
  }
}