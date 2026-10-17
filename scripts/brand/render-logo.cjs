// Renders the 512x512 OpenSourceX logo (app icon on a dark rounded tile) used for the GitHub
// and Google OAuth apps. Usage: node scripts/brand/render-logo.cjs [out.png]
const path = require("node:path");
// sharp ships with Next.js; resolve it through the web app's next install
const web = path.join(__dirname, "../../apps/web");
const nextDir = path.dirname(require.resolve("next/package.json", { paths: [web] }));
const sharp = require(require.resolve("sharp", { paths: [nextDir] }));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="a" x1="4" y1="16" x2="31" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#8FA8FF"/><stop offset="1" stop-color="#6F8CFF"/></linearGradient>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop stop-color="#141a2b"/><stop offset="1" stop-color="#05070c"/></radialGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <g transform="translate(16 16) scale(0.78) translate(-16 -16) rotate(-45 16 16)">
    <path fill="#F2F4F8" d="M11 3C27 9 27 23 11 29C20 23 20 9 11 3Z"/>
    <path d="M11 3L7 16L11 29" fill="none" stroke="#F2F4F8" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 16H26" stroke="url(#a)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M22.5 10L31.5 16L22.5 22L25 16Z" fill="url(#a)"/>
  </g>
</svg>`;
sharp(Buffer.from(svg), { density: 1200 })
  .resize(512, 512)
  .png()
  .toFile(process.argv[2] ?? path.join(web, "public/brand/opensourcex-logo-512.png"))
  .then((i) => console.log("saved", i.width + "x" + i.height, i.size, "bytes"));
