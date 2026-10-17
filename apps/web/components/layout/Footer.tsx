import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

const LINKS: [string, string][] = [
  ["About", "/product"],
  ["Help & support", "/support"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Security", "/security"],
];

/** Slim site footer for the signed-in app. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <div className="site-footer-brand">
          <LogoMark size={20} />
          <span>OpenSourceX</span>
          <span className="site-footer-copy">© {new Date().getFullYear()}</span>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <a
            href="https://github.com/bhuvan-somisetty/OpenSourceX"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
