import { IsIn, IsUUID } from "class-validator";

export const ORDER_CURRENCIES = ["IDR", "USD"] as const;
export type OrderCurrency = (typeof ORDER_CURRENCIES)[number];

export class CreateOrderDto {
  @IsUUID()
  documentGuideId: string;

  @IsIn(ORDER_CURRENCIES)
  currency: OrderCurrency;
}
