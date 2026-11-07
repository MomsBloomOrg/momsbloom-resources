import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// MomsBloom uses Nunito everywhere. `next/font` downloads the font at build time and serves it from
// our own site, so the browser makes no request to Google.
const nunito = Nunito({
  variable: "--next-font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  description: "Find support for pregnancy and the postpartum period in Kent County.",
};

// The root layout wraps every page in the app. Each page's content goes in `children`.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
