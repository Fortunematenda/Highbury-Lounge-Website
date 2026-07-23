import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <Link
        className="brand brand-with-logo footer-brand"
        href="/"
        aria-label="Highbury Lounge home"
      >
        <img
          className="brand-logo brand-logo-footer"
          src="/images/highbury-lounge-logo-light.png"
          alt="Highbury Lounge"
        />
      </Link>
      <p>Accommodation · Conferences · Events · Dining</p>
      <div className="footer-credit">
        <small>© 2026 Highbury Lounge. All rights reserved.</small>
        <small>
          Powered by <strong>Bretune Technologies</strong>
        </small>
      </div>
    </footer>
  );
}
