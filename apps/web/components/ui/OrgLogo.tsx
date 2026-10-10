"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getOrgInitials } from "@/lib/orgs";

interface OrgLogoProps {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}

export { getOrgInitials };

/**
 * Organizations whose official logos are monochrome dark/black and require
 * a crisp white high-contrast background container to remain fully legible on dark themes.
 */
const WHITE_BG_ORGS = new Set([
  "podman-container-tools",
  "notary",
  "tuf",
  "cartography",
  "cortex",
  "devfile",
  "flatcar-container-linux",
  "kuma",
  "pipecd",
  "open-service-mesh",
  "open-service-mesh-kuma-and-service-mesh-interface",
]);

/**
 * Reusable Organization Logo component for CNCF & LFX organizations.
 * Loads verified official SVG/PNG assets from /logos/orgs/[slug].svg with
 * graceful fallback to a monogram badge.
 */
export function OrgLogo({ slug, name, size = 48, className = "" }: OrgLogoProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getOrgInitials(name);
  const isWhiteBg = WHITE_BG_ORGS.has(slug);
  const isOpenEverest = slug === "openeverest";

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: Math.max(8, Math.round(size * 0.2)),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isWhiteBg ? "#ffffff" : "var(--card-bg, #11141d)",
    border: isWhiteBg
      ? "1px solid rgba(255, 255, 255, 0.25)"
      : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
    boxShadow: isWhiteBg
      ? "0 2px 10px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
      : "0 2px 8px rgba(0,0,0,0.25)",
    padding: isWhiteBg ? 4 : (isOpenEverest ? 0 : 2),
  };

  if (hasError) {
    return (
      <div
        className={`org-logo-fallback ${className}`}
        style={{
          ...containerStyle,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "var(--text, #f8fafc)",
          fontWeight: 700,
          fontSize: Math.max(12, Math.round(size * 0.36)),
          letterSpacing: "0.02em",
          userSelect: "none",
        }}
        aria-label={`${name} logo`}
        title={name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  const imageSize = isOpenEverest
    ? size - 2
    : isWhiteBg
      ? size - 10
      : size - 10;

  return (
    <div
      className={`org-logo-wrap ${className}`}
      style={containerStyle}
      title={name}
      aria-label={`${name} logo`}
    >
      <Image
        src={`/logos/orgs/${slug}.svg`}
        alt={`${name} official logo`}
        width={imageSize}
        height={imageSize}
        style={{
          width: "auto",
          height: "auto",
          maxWidth: isOpenEverest ? size - 2 : imageSize,
          maxHeight: isOpenEverest ? size - 2 : imageSize,
          objectFit: "contain",
        }}
        onError={() => setHasError(true)}
        unoptimized
      />
    </div>
  );
}
