import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: { default: "OpenSourceX", template: "%s · OpenSourceX" },
  description:
    "Intelligence for open source. Understand programs, projects and repositories, with a source behind every fact.",
  // Google Search Console ownership check (needed for Google sign-in branding verification)
  ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
};
// Geist for text, Geist Mono for code and numbers; self-hosted by Next at build time
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Strictly locks to original dark mode and clears any saved light theme
const themeInit = `try{localStorage.removeItem("osx-theme");document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
