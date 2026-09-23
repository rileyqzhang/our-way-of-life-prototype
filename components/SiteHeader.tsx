"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["Home", "/"],
  ["Interactive Timeline", "/timeline"],
  ["Share Your Story", "/share-your-story"],
  ["Participants", "/stories"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="siteHeader">
      <div className="container nav">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <img
            className="brandLogo"
            src="/logo.png"
            alt="Our Way of Life Archive"
            width={80}
            height={80}
          />
        </Link>
        <button
          type="button"
          className="navToggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav
          id="primary-navigation"
          className={open ? "navLinks isOpen" : "navLinks"}
          aria-label="Primary navigation"
        >
          {links.map(([label, href]) => {
            const current = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={current ? "isCurrent" : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
