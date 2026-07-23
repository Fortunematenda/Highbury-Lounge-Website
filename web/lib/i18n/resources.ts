import enCommon from "@/locales/en/common.json";
import enBooking from "@/locales/en/booking.json";
import enRooms from "@/locales/en/rooms.json";
import enConference from "@/locales/en/conference.json";
import enMenu from "@/locales/en/menu.json";
import enValidation from "@/locales/en/validation.json";

import zhCommon from "@/locales/zh-CN/common.json";
import zhBooking from "@/locales/zh-CN/booking.json";
import zhRooms from "@/locales/zh-CN/rooms.json";
import zhConference from "@/locales/zh-CN/conference.json";
import zhMenu from "@/locales/zh-CN/menu.json";
import zhValidation from "@/locales/zh-CN/validation.json";

import snCommon from "@/locales/sn/common.json";
import snBooking from "@/locales/sn/booking.json";
import snRooms from "@/locales/sn/rooms.json";
import snConference from "@/locales/sn/conference.json";
import snMenu from "@/locales/sn/menu.json";
import snValidation from "@/locales/sn/validation.json";

import ndCommon from "@/locales/nd/common.json";
import ndBooking from "@/locales/nd/booking.json";
import ndRooms from "@/locales/nd/rooms.json";
import ndConference from "@/locales/nd/conference.json";
import ndMenu from "@/locales/nd/menu.json";
import ndValidation from "@/locales/nd/validation.json";

import type { AppLocale } from "@/lib/i18n/locales";

export const NAMESPACES = [
  "common",
  "booking",
  "rooms",
  "conference",
  "menu",
  "validation",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const resources: Record<
  AppLocale,
  Record<Namespace, Record<string, unknown>>
> = {
  en: {
    common: enCommon,
    booking: enBooking,
    rooms: enRooms,
    conference: enConference,
    menu: enMenu,
    validation: enValidation,
  },
  "zh-CN": {
    common: zhCommon,
    booking: zhBooking,
    rooms: zhRooms,
    conference: zhConference,
    menu: zhMenu,
    validation: zhValidation,
  },
  sn: {
    common: snCommon,
    booking: snBooking,
    rooms: snRooms,
    conference: snConference,
    menu: snMenu,
    validation: snValidation,
  },
  nd: {
    common: ndCommon,
    booking: ndBooking,
    rooms: ndRooms,
    conference: ndConference,
    menu: ndMenu,
    validation: ndValidation,
  },
};
