"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";

const navigation = [
  { href: "/", label: "Marketplace" },
  { href: "/mint", label: "Mint card" },
  { href: "/collection", label: "My collection" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>Mythic</strong>
            <small>Bazaar</small>
          </span>
        </Link>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className={menuOpen ? "site-nav is-open" : "site-nav"}>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-wallet">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
