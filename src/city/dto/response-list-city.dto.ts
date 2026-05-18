export class CityCountrySummaryDto {
  id: number
  name: string
}

export class ResponseListCityDto {
  id: number;
  name: string;
  country: CityCountrySummaryDto;
  createdAt: Date;
  updatedAt: Date;

  constructor(row: {
    id: number;
    name: string;
    country: CityCountrySummaryDto;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = row.id;
    this.name = row.name;
    this.country = row.country;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
  }
}
