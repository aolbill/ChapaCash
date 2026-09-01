import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_BANNER, SITE_NAME } from "@/domain/copy";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — crash game with M-PESA`,
  applicationName: SITE_NAME,
  description: SITE_BANNER,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <div className="border-b border-brand-sand/70 bg-brand-sand/35 px-4 py-2 text-center text-[11px] font-medium leading-snug text-brand-wine sm:text-xs">
          {SITE_BANNER}
        </div>
        {children}
      </body>
    </html>
  );
}
