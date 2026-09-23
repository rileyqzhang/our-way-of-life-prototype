import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="goldBar" aria-hidden="true" />
      <div className="container footerInner">
        <strong>Our Way of Life Archive</strong>
        <div className="footerLinks">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/share-your-story">Share Your Story</Link>
          <a href="https://dap.berkeley.edu/">Accessibility</a>
        </div>
      </div>
    </footer>
  );
}
