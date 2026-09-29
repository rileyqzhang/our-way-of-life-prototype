import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pageHero">
      <div className="container">
        <h1 className="display">Page not found</h1>
        <p className="lede">That page is not in the archive.</p>
        <p>
          <Link className="button" href="/en">
            Home
          </Link>
        </p>
      </div>
    </section>
  );
}
