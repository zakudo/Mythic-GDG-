import Link from "next/link";
import type { ReactNode } from "react";
import { Code2, ShieldCheck, Sparkles } from "lucide-react";
import { NetworkBanner } from "@/components/network-banner";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <div className="atmosphere" aria-hidden="true">
        <span className="orb orb-one" />
        <span className="orb orb-two" />
        <span className="star-field" />
      </div>
      <SiteHeader />
      <NetworkBanner />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <Link className="brand brand-footer" href="/">
              <span className="brand-mark" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <span>
                <strong>Mythic</strong>
                <small>Bazaar</small>
              </span>
            </Link>
            <p>Unique celestial game cards, secured by Ethereum.</p>
          </div>
          <div className="footer-meta">
            <span>
              <ShieldCheck size={16} /> Local Hardhat chain
            </span>
            <span>
              <Code2 size={16} /> Open contracts
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
