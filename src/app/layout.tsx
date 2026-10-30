import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

const jost = Jost({ subsets: ["latin"], weight: "variable", variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Vision Blend admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F8F8F6", colorScheme: "light" };

/** The admin is its own deployment: no locale, no public header or footer. */
export default function AdminRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={jost.variable}>
      <body className="min-h-svh bg-tint">{children}</body>
    </html>
  );
}
