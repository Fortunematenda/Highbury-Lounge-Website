export const FOOD_ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Delivered",
  "Cancelled",
] as const;

export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];

export function isFoodOrderStatus(value: string): value is FoodOrderStatus {
  return (FOOD_ORDER_STATUSES as readonly string[]).includes(value);
}
