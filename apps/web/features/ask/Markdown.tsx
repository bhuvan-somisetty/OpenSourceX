"use client";

import Link from "next/link";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Safe Markdown for answers: no raw HTML, internal links stay in the app, external ones open a new tab. */
const components: Components = {
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href}>{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  table: ({ children }) => (
    <div className="md-table">
      <table>{children}</table>
    </div>
  ),
};

const safeUrl = (url: string) => (/^(https?:|mailto:|\/(?!\/)|#)/i.test(url) ? url : "");

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} urlTransform={safeUrl}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
