import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_BANNER, SITE_NAME } from "@/domain/copy";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — crash game with M-PESA`,
  applicationName: SITE_NAME,
  description: SITE_BANNER,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f4f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans">
        <div className="border-b border-brand-sand/70 bg-brand-sand/35 px-3 py-2 text-center text-[11px] font-medium leading-snug text-brand-wine sm:px-4 sm:text-xs" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
          {SITE_BANNER}
        </div>
        {children}
      </body>
    </html>
  );
}
