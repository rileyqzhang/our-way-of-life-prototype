import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <section className="pageHero"><div className="container"><p className="eyebrow">Contact</p><h1 className="display">Get in touch</h1><p className="lede">Add the project’s verified contact information here before launch.</p></div></section>
      <section className="section"><div className="container callout"><h2>Project contact details</h2><p>This placeholder avoids publishing an unverified email address or staff contact.</p></div></section>
    </>
  );
}
