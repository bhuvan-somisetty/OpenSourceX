import type { ReactNode } from "react";

export const metadata = {
  title: "OpenSourceX",
  description: "An intelligence layer for navigating open source.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
