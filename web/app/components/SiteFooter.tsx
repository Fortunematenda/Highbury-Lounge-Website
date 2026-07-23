"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function SiteFooter() {
  const { t } = useTranslation("common");
  return (
    <footer>
      <Link
        className="brand brand-with-logo footer-brand"
        href="/"
        aria-label={t("brand.homeAria")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-logo brand-logo-footer"
          src="/images/highbury-lounge-logo-light.png"
          alt="Highbury Lounge"
        />
      </Link>
      <p>{t("footer.tagline")}</p>
      <div className="footer-credit">
        <small>{t("footer.rights")}</small>
        <small>
          {t("footer.poweredBy")} <strong>{t("footer.poweredByName")}</strong>
        </small>
      </div>
    </footer>
  );
}
