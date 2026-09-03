import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: {
    default: "Mythic Bazaar — Celestial Game Cards",
    template: "%s | Mythic Bazaar",
  },
  description:
    "Mint, collect, and trade unique celestial game cards on a local Ethereum sandbox.",
  applicationName: "Mythic Bazaar",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
