export const MENU_ITEM_TYPES = [
  "food",
  "drink",
  "accommodation_extra",
  "conference_extra",
  "catering_package",
  "equipment_hire",
  "decoration",
  "service",
  "other",
] as const;

export type MenuItemType = (typeof MENU_ITEM_TYPES)[number];

export const MENU_ITEM_TYPE_LABELS: Record<MenuItemType, string> = {
  food: "Food",
  drink: "Drink",
  accommodation_extra: "Accommodation Extra",
  conference_extra: "Conference Extra",
  catering_package: "Catering Package",
  equipment_hire: "Equipment Hire",
  decoration: "Decoration",
  service: "Service",
  other: "Other",
};

export const PRICE_UNITS = [
  "per_item",
  "per_person",
  "per_serving",
  "per_day",
  "per_hour",
  "per_package",
  "per_event",
] as const;

export type PriceUnit = (typeof PRICE_UNITS)[number];

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  per_item: "Per item",
  per_person: "Per person",
  per_serving: "Per serving",
  per_day: "Per day",
  per_hour: "Per hour",
  per_package: "Per package",
  per_event: "Per event",
};

export const FOOD_LIKE_TYPES = new Set<MenuItemType>([
  "food",
  "catering_package",
]);

export function isMenuItemType(value: string): value is MenuItemType {
  return (MENU_ITEM_TYPES as readonly string[]).includes(value);
}

export function isPriceUnit(value: string): value is PriceUnit {
  return (PRICE_UNITS as readonly string[]).includes(value);
}
