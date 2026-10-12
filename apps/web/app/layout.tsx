import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: { default: "OpenSourceX", template: "%s · OpenSourceX" },
  description:
    "Intelligence for open source. Understand programs, projects and repositories, with a source behind every fact.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Strictly locks to original dark mode and clears any saved light theme
const themeInit = `try{localStorage.removeItem("osx-theme");document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
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
