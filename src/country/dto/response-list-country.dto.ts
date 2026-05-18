export class CountryRegionSummaryDto {
  id: number;
  name: string;
}

export class ResponseListCountryDto {
  id: number;
  name: string;
  region: CountryRegionSummaryDto;
  createdAt: Date;
  updatedAt: Date;

  constructor(row: {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    region: CountryRegionSummaryDto;
  }) {
    this.id = row.id;
    this.name = row.name;
    this.region = row.region;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
