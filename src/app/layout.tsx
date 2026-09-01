import type { Metadata } from "next";
import "./globals.css";
import { SITE_BANNER, SITE_NAME } from "@/domain/copy";

export const metadata: Metadata = {
  title: `${SITE_NAME} — crash game with M-PESA`,
  applicationName: SITE_NAME,
  description: SITE_BANNER,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="border-b border-brand-sand bg-brand-sand/40 px-4 py-2 text-center text-xs font-medium text-brand-wine sm:text-sm">
          {SITE_BANNER}
        </div>
        {children}
      </body>
    </html>
  );
}
