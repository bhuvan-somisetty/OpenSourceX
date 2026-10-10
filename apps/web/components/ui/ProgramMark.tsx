import React from "react";
import Image from "next/image";
import { PROGRAM_CATALOG, monogram, programDef } from "@/lib/programs";

/**
 * Official Google Summer of Code (GSoC) vector mark
 */
function GsocLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gsoc-official-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA000" />
          <stop offset="50%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gsoc-official-grad)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="m11.995 0-.954.954L9.24 2.758l-.755.725h-4.97v5.001L0 12.004l2.758 2.76.755.752v4.973h4.971L11.995 24l3.523-3.511h4.961v-4.973L24 12.005l-3.52-3.521v-5h-5.01zm0 5.068a6.928 6.928 0 0 1 6.94 6.918v.019a6.937 6.937 0 1 1-6.94-6.937Zm.436 3.457-1.709 6.339.94.253 1.709-6.339zm1.97 1.047-.715.649 1.431 1.594-1.431 1.593.725.649 2.013-2.242zm-4.8.01-2.014 2.242L9.6 14.075l.725-.648-1.431-1.594 1.431-1.603z"
      />
    </svg>
  );
}

/**
 * Official Linux Foundation (LFX) vector logo matching the brand identity
 */
function LfxLogo() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Dark Navy Blue Outer Frame (Top, Right, Bottom-Right & Top-Left Tab) */}
      <path
        d="M0 0 H100 V100 H70 V80 H80 V20 H20 V30 H0 V0 Z"
        fill="#003764"
      />
      {/* Light Cyan L-Mark (Bottom-Left) */}
      <path
        d="M0 40 H20 V80 H60 V100 H0 V40 Z"
        fill="#0099FF"
      />
    </svg>
  );
}

/**
 * Official full horizontal lockup: The Linux Foundation mark + wordmark typography
 */
export function LinuxFoundationFullLogo({ height = 135 }: { height?: number }) {
  const width = Math.round(height * (119 / 40));
  return (
    <div
      className="linux-foundation-brand"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: "min(520px, 92vw)",
        margin: "0 auto",
        padding: "8px 0",
      }}
      title="The Linux Foundation"
      aria-label="The Linux Foundation official logo"
    >
      <svg
        viewBox="0 0 119 40"
        width={width}
        height={height}
        fill="currentColor"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          maxHeight: 160,
          aspectRatio: "119 / 40",
          color: "var(--text, #ffffff)",
          filter: "drop-shadow(0 8px 32px rgba(0, 153, 255, 0.35))",
        }}
        aria-hidden="true"
      >
        {/* THE */}
        <path d="m 46.1239,0.9458 v 0.697 h 2.991 v 7.88 h 0.817 v -7.88 h 2.991 v -0.697 z" />
        <path d="m 59.6383,0.9458 v 3.724 h -5.093 v -3.724 h -0.816 v 8.577 h 0.816 v -4.156 h 5.093 v 4.156 h 0.816 v -8.577 z" />
        <path d="m 62.1862,0.9458 v 8.577 h 5.981 v -0.697 h -5.165 v -3.387 h 4.781 v -0.697 h -4.781 v -3.099 h 5.105 v -0.697 z" />

        {/* LINUX */}
        <path d="m 46.1242,12.0766 h 4.728 v 11.412 h 6.791 v 3.933 h -11.519 z" />
        <path d="m 60.737,12.077 h 4.728 v 15.345 h -4.728 z" />
        <path d="m 68.9891,12.0766 h 4.835 l 4.47,8.21 h 0.044 v -8.21 h 4.47 v 15.345 h -4.599 l -4.707,-8.382 h -0.043 v 8.382 h -4.47 z" />
        <path d="m 100.2782,21.4897 c 0,4.277 -2.256,6.297 -6.985,6.297 -4.727,0 -7.006,-2.02 -7.006,-6.297 v -9.413 h 4.729 v 8.36 c 0,1.547 -0.022,3.524 2.299,3.524 2.235,0 2.235,-1.977 2.235,-3.524 v -8.36 h 4.728 z" />
        <path d="m 107.7989,19.2547 -5.051,-7.178 h 5.545 l 2.321,4.169 2.278,-4.169 h 5.244 l -4.921,7.221 5.48,8.124 h -5.696 l -2.621,-4.578 -2.708,4.578 h -5.416 z" />

        {/* FOUNDATION */}
        <path d="m 46.1239,30.806 v 8.576 h 0.817 v -4.084 h 4.108 v -0.697 h -4.108 v -3.098 h 4.624 v -0.697 z" />
        <path d="m 56.1665,38.8657 c 2.258,0 3.219,-1.898 3.219,-3.772 0,-1.873 -0.961,-3.771 -3.219,-3.771 -2.27,0 -3.231,1.898 -3.231,3.771 0,1.874 0.961,3.772 3.231,3.772 m 0,-8.24 c 2.691,0 4.036,2.114 4.036,4.468 0,2.355 -1.345,4.469 -4.036,4.469 -2.703,0 -4.048,-2.114 -4.048,-4.469 0,-2.354 1.345,-4.468 4.048,-4.468" />
        <path d="m 61.3932,30.8058 h 0.817 v 5.309 c 0,1.982 0.924,2.751 2.51,2.751 1.598,0 2.522,-0.769 2.522,-2.751 v -5.309 h 0.817 v 5.489 c 0,1.766 -0.949,3.268 -3.339,3.268 -2.366,0 -3.327,-1.502 -3.327,-3.268 z" />
        <path d="m 69.6943,30.8058 h 0.913 l 4.997,7.255 h 0.024 v -7.255 h 0.816 v 8.576 h -0.912 l -4.997,-7.255 h -0.024 v 7.255 h -0.817 z" />
        <path d="m 78.9805,38.6854 h 1.742 c 2.462,0 3.531,-1.021 3.531,-3.592 0,-2.57 -1.069,-3.591 -3.531,-3.591 h -1.742 z m -0.817,-7.88 h 2.967 c 2.595,0.06 3.94,1.454 3.94,4.288 0,2.835 -1.345,4.228 -3.94,4.288 h -2.967 z" />
        <path d="m 87.6063,36.0189 h 3.375 l -1.658,-4.396 z m 1.297,-5.213 h 0.913 l 3.363,8.576 h -0.876 l -1.045,-2.666 h -3.904 l -1.033,2.666 h -0.877 z" />
        <path d="m 92.2199,30.8053 v 0.697 h 2.991 v 7.88 h 0.817 v -7.88 h 2.991 v -0.697 z" />
        <path d="m 99.884,30.806 h 0.817 v 8.576 h -0.817 z" />
        <path d="m 106.0822,38.8657 c 2.258,0 3.219,-1.898 3.219,-3.772 0,-1.873 -0.961,-3.771 -3.219,-3.771 -2.27,0 -3.231,1.898 -3.231,3.771 0,1.874 0.961,3.772 3.231,3.772 m 0,-8.24 c 2.691,0 4.036,2.114 4.036,4.468 0,2.355 -1.345,4.469 -4.036,4.469 -2.703,0 -4.048,-2.114 -4.048,-4.469 0,-2.354 1.345,-4.468 4.048,-4.468" />
        <path d="m 111.381,30.8058 h 0.913 l 4.997,7.255 h 0.024 v -7.255 h 0.816 v 8.576 h -0.912 l -4.997,-7.255 h -0.024 v 7.255 h -0.817 z" />

        {/* Mark Frame (Top & Right) */}
        <path
          d="M 39.4285,0.8 H 0.8595 v 11.574 h 7.712 V 8.549 h 23.145 v 23.118 h -3.852 v 7.715 h 11.564 z"
          fill="currentColor"
        />

        {/* Mark Corner L (Bottom-Left) */}
        <path
          d="m 8.5827,31.6667 v -15.427 h -7.729 v 23.142 h 23.152 v -7.715 z"
          fill="#0099FF"
        />
      </svg>
    </div>
  );
}

/**
 * Official Bitcoin (Summer of Bitcoin) vector mark
 */
function BitcoinLogo() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sob-bitcoin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB300" />
          <stop offset="60%" stopColor="#F7931A" />
          <stop offset="100%" stopColor="#E67E00" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="url(#sob-bitcoin-grad)"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.5"
      />
      <path
        fill="#FFFFFF"
        d="M46.1 27.44c.64-4.24-2.6-6.53-7.04-8.08l1.44-5.74-3.51-.88-1.4 5.62c-.92-.23-1.88-.45-2.84-.67l1.4-5.67-3.52-.88-1.44 5.77c-.76-.18-1.51-.35-2.24-.53l-4.84-1.2-.93 3.75s2.6.6 2.55.63c1.43.36 1.68 1.3 1.64 2.04l-3.94 15.79c-.2.44-.64 1.08-1.64.84.04.05-2.56-.64-2.56-.64l-1.76 4.03 4.56 1.14c2.48.65 2.48.62-1.44 5.84l3.52.87 1.44-5.79c.96.27 1.88.51 2.8.73l-1.36 5.74 3.52.88 1.45-5.84c5.97 1.14 10.48.68 12.37-4.73 1.52-4.37-.08-6.88-3.25-8.52 2.28-.51 4-2.03 4.48-5.15zm-8.03 11.25c-1.08 4.37-8.42 2-10.8 1.41l1.92-7.73c2.39.61 10.02 1.79 8.88 6.32zm1.1-11.31c-.99 3.97-7.1 1.96-9.08 1.47l1.74-7.04c1.99.48 8.37 1.4 7.34 5.57z"
      />
    </svg>
  );
}

/**
 * Official Outreachy vector mark (from official outreachy.org assets)
 */
function OutreachyLogo() {
  return (
    <svg
      viewBox="40 630 765 165"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stepped Cyan / Turquoise Banner */}
      <path
        d="M123.89 637.72v37.33H86.56v37.33H49.23v74.67H721.23v-37.33h37.33v-37.33h37.33v-74.67z"
        fill="#59CFE6"
      />

      {/* White Stepped Accent Border Line */}
      <path
        d="M70.56 787.06H700v-37.33h37.33v-37.33h37.33"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />

      {/* Official OUTREACHY Typography Vector Paths */}
      <g
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeMiterlimit="4"
        transform="translate(2165.8282, -1464.5155)"
      >
        <path d="m -2006.2094,2204.6961 c 3.4932,0 6.9165,-0.6987 10.0604,-2.026 3.1439,-1.3275 5.8686,-3.2138 8.2438,-5.5891 2.3754,-2.3754 4.2618,-5.1001 5.5891,-8.2439 1.3274,-3.1439 2.0261,-6.5671 2.0261,-10.0604 0,-3.4931 -0.6987,-6.9164 -2.0261,-10.0602 -1.3273,-3.1439 -3.2137,-5.8686 -5.5891,-8.244 -2.3752,-2.3753 -5.0999,-4.2616 -8.2438,-5.589 -3.1439,-1.3274 -6.5672,-2.0261 -10.0604,-2.0261 -3.4931,0 -6.9165,0.6987 -10.0603,2.0261 -3.1438,1.3274 -5.8685,3.2137 -8.2439,5.589 -2.3754,2.3754 -4.2617,5.1001 -5.589,8.244 -1.3275,3.1438 -2.026,6.5671 -2.026,10.0602 0,3.4933 0.6985,6.9165 2.026,10.0604 1.3273,3.1438 3.2136,5.8685 5.589,8.2439 2.3754,2.3753 5.1001,4.2616 8.2439,5.5891 3.1438,1.3273 6.5672,2.026 10.0603,2.026 m 0,-45.5509 c 5.2398,0 10.2001,2.026 13.9028,5.7287 3.7029,3.7028 5.7289,8.6631 5.7289,13.9028 0,5.2398 -2.026,10.2002 -5.7289,13.9029 -3.7027,3.7027 -8.663,5.7288 -13.9028,5.7288 -5.2397,0 -10.2,-2.0261 -13.9028,-5.7288 -3.7027,-3.7027 -5.7288,-8.6631 -5.7288,-13.9029 0,-5.2397 2.0261,-10.2 5.7288,-13.9028 3.7028,-3.7027 8.6631,-5.7287 13.9028,-5.7287" />
        <path d="m -1936.902,2204.6961 c 3.0042,0 5.9385,-0.5589 8.6631,-1.7466 2.6548,-1.1178 5.0302,-2.7246 7.0562,-4.7507 2.0261,-2.026 3.6329,-4.4014 4.7507,-7.0562 1.1877,-2.7247 1.7467,-5.659 1.7467,-8.663 v -29.6222 h -6.2878 v 29.6222 c 0,4.2616 -1.6767,8.2438 -4.6809,11.248 -3.004,3.004 -6.9863,4.6808 -11.248,4.6808 -4.2616,0 -8.2438,-1.6768 -11.248,-4.6808 -3.0041,-3.0042 -4.6808,-6.9864 -4.6808,-11.248 v -29.6222 h -6.2877 v 29.6222 c 0,3.004 0.5589,5.9383 1.7466,8.663 1.1178,2.6548 2.7246,5.0302 4.7507,7.0562 2.026,2.0261 4.4014,3.6329 7.0562,4.7507 2.7247,1.1877 5.659,1.7466 8.663,1.7466" />
        <path d="m -1852.5335,2152.8574 h -41.0797 v 6.2878 h 17.3959 v 45.5509 h 6.2878 v -45.5509 h 17.396 v -6.2878" />
        <path d="m -1798.7053,2204.6961 h 7.685 l -14.8111,-20.959 c 3.6329,-0.2795 6.9864,-1.8863 9.5713,-4.4713 2.9343,-2.9343 4.5412,-6.7767 4.5412,-10.9685 0,-4.1219 -1.6069,-7.9645 -4.5412,-10.8988 -2.9342,-2.9342 -6.7767,-4.5411 -10.8986,-4.5411 h -22.4961 v 0 51.8387 h 6.2878 v -20.8892 h 9.8506 l 14.8111,20.8892 m -24.6617,-45.5509 h 16.2083 c 5.0301,0 9.1521,4.1219 9.1521,9.1521 0,5.0999 -4.122,9.222 -9.1521,9.222 h -16.2083 v -18.3741" />
        <path d="m -1759.9021,2198.4084 v -18.3741 h 21.0289 v -6.2877 h -21.0289 v -14.6014 h 24.7316 v -6.2878 h -31.0193 v 51.8387 h 3.1438 29.4825 v -6.2877 h -26.3386" />
        <path d="m -1690.2807,2152.8574 -23.1947,51.8387 h 6.9165 l 5.3795,-12.0165 h 28.9933 l 5.3795,12.0165 h 6.9165 l -23.2646,-51.8387 h -7.126 m -8.1042,33.5345 11.6672,-26.129 11.7371,26.129 h -23.4043" />
        <path d="m -1619.2871,2204.6961 c 3.4931,0 6.9164,-0.6987 10.0603,-2.026 3.1438,-1.3275 5.8685,-3.2138 8.2439,-5.5891 l -4.4014,-4.4014 c -3.7027,3.7027 -8.6631,5.7288 -13.9028,5.7288 -5.2398,0 -10.2002,-2.0261 -13.9029,-5.7288 -3.7027,-3.7027 -5.7287,-8.6631 -5.7287,-13.9029 0,-5.2397 2.026,-10.2 5.7287,-13.9028 3.7027,-3.7027 8.6631,-5.7287 13.9029,-5.7287 5.2397,0 10.2001,2.026 13.9028,5.7287 l 4.4014,-4.4014 c -2.3754,-2.3753 -5.1001,-4.2616 -8.2439,-5.589 -3.1439,-1.3274 -6.5672,-2.0261 -10.0603,-2.0261 -3.4932,0 -6.9165,0.6987 -10.0604,2.0261 -3.1438,1.3274 -5.8685,3.2137 -8.2439,5.589 -2.3753,2.3754 -4.2616,5.1001 -5.5891,8.244 -1.3273,3.1438 -2.026,6.5671 -2.026,10.0602 0,3.4933 0.6987,6.9165 2.026,10.0604 1.3275,3.1438 3.2138,5.8685 5.5891,8.2439 2.3754,2.3753 5.1001,4.2616 8.2439,5.5891 3.1439,1.3273 6.5672,2.026 10.0604,2.026" />
        <path d="m -1545.0457,2153.067 v 20.8892 h -28.5042 v -20.8892 h -6.2878 v 51.6291 h 6.2878 v -24.4522 h 28.5042 v 24.6618 h 6.2877 v -51.8387 h -6.2877" />
        <path d="m -1483.2343,2152.8574 -13.3439,18.5837 -13.2741,-18.5837 h -7.7548 l 17.885,25.0112 v 26.8275 h 6.2876 v -26.8275 l 17.955,-25.0112 h -7.7548" />
      </g>
    </svg>
  );
}

/**
 * Official Google Season of Docs vector mark
 */
function SeasonOfDocsLogo() {
  return (
    <svg
      viewBox="0 0 36 36"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gsod-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#1967D2" />
        </linearGradient>
      </defs>
      <path
        d="M10 6C8.89543 6 8 6.89543 8 8V28C8 29.1046 8.89543 30 10 30H26C27.1046 30 28 29.1046 28 28V13.5L20.5 6H10Z"
        fill="url(#gsod-blue)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <path d="M20.5 6V13.5H28L20.5 6Z" fill="#A8C7FA" />
      <line
        x1="12"
        y1="17"
        x2="24"
        y2="17"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="21"
        x2="22"
        y2="21"
        stroke="#34A853"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="25"
        x2="18"
        y2="25"
        stroke="#FBBC04"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Official Major League Hacking (MLH) vector mark (matching exact official brand identity)
 */
function MlhLogo() {
  return (
    <svg
      viewBox="0 0 311 106"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Red 'M' */}
      <path
        fill="#E73427"
        d="M98.85 1.41A17.32 17.32 0 0 1 108 10.57a16.51 16.51 0 0 1 1.41 6.68v86.06a2.78 2.78 0 0 1-2.75 2.8H86a2.43 2.43 0 0 1-1.92-.82 2.82 2.82 0 0 1-.74-2V25.12H66.79v78.22a2.87 2.87 0 0 1-.74 2 2.52 2.52 0 0 1-1.93.82H45.47a2.78 2.78 0 0 1-2.82-2.74V25.12H26.07v78.22a2.49 2.49 0 0 1-2.82 2.81H2.82A2.49 2.49 0 0 1 0 103.34V2.81A2.49 2.49 0 0 1 2.82 0H92.11A16.46 16.46 0 0 1 98.85 1.41Z"
      />
      {/* Blue 'L' */}
      <path
        fill="#1D539F"
        d="M199.19 80.38a2.69 2.69 0 0 1 2 .83 2.89 2.89 0 0 1 .78 2.05v20a2.83 2.83 0 0 1-.78 2 2.67 2.67 0 0 1-2 .84h-70.5c-2 0-3-1-3-2.88V2.88c0-1.92 1-2.88 3-2.88h21.64c2 0 3 1 3 2.88V77.65a2.49 2.49 0 0 0 .91 2 3.09 3.09 0 0 0 2.11.77Z"
      />
      {/* Gold 'H' */}
      <path
        fill="#F8B92A"
        d="M307.54 0a2.94 2.94 0 0 1 2.14.84 2.76 2.76 0 0 1 .91 2.05V103.57a2.76 2.76 0 0 1-.91 2.05 2.94 2.94 0 0 1-2.14.84H285.62a2.93 2.93 0 0 1-2.13-.84 2.69 2.69 0 0 1-.91-2.05V68.44a2.63 2.63 0 0 0-.79-2 2.82 2.82 0 0 0-2.05-.76H249a3.09 3.09 0 0 0-2.13.76 2.5 2.5 0 0 0-.91 2v35.13c0 1.92-1 2.89-3 2.89H221.2c-2 0-3-1-3-2.89V2.89c0-1.93 1-2.89 3-2.89H243c2 0 3 1 3 2.89V37c0 1.92 1 2.88 3 2.88h30.81a2.74 2.74 0 0 0 2.06-.83 2.93 2.93 0 0 0 .79-2V2.89a2.71 2.71 0 0 1 .9-2.05A2.92 2.92 0 0 1 285.62 0Z"
      />
    </svg>
  );
}

/**
 * Official CNCF (Cloud Native Computing Foundation) vector mark
 */
function CncfLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cncf-official-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0086FF" />
          <stop offset="100%" stopColor="#00C8FF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#cncf-official-blue)"
        d="M0 0v24h24V0H8.004Zm3.431 3.431h4.544l.029.023 4.544 4.544h3.03l-4.572-4.567h9.569v9.563l-.789-.782-3.784-3.79v3.03l2.271 2.272 2.272 2.272.029.03v4.543h-4.55l-.023-.023-2.272-2.278-2.272-2.272H8.427l3.785 3.79.782.783H3.43v-9.563l4.573 4.567v-3.031l-4.55-4.544-.023-.023Z"
      />
    </svg>
  );
}

/**
 * Official European Summer of Code (ESoC) vector mark
 */
function EsocLogo() {
  const stars = [
    [50, 16.5],
    [57.75, 18.58],
    [63.42, 24.25],
    [65.5, 32],
    [63.42, 39.75],
    [57.75, 45.42],
    [50, 47.5],
    [42.25, 45.42],
    [36.58, 39.75],
    [34.5, 32],
    [36.58, 24.25],
    [42.25, 18.58],
  ];

  return (
    <svg
      viewBox="0 0 100 64"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="esoc-flag-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0044B5" />
          <stop offset="100%" stopColor="#002984" />
        </linearGradient>
        <linearGradient id="esoc-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE033" />
          <stop offset="100%" stopColor="#FFB800" />
        </linearGradient>
      </defs>

      {/* European Flag Backdrop */}
      <rect width="100" height="64" rx="8" fill="url(#esoc-flag-blue)" />

      {/* Left Chevron < */}
      <path
        d="M24 18 L10 32 L24 46"
        stroke="url(#esoc-gold-grad)"
        strokeWidth="5.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Right Chevron > */}
      <path
        d="M76 18 L90 32 L76 46"
        stroke="url(#esoc-gold-grad)"
        strokeWidth="5.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* Circle of 12 European Stars */}
      <g fill="url(#esoc-gold-grad)">
        {stars.map(([cx, cy], i) => (
          <polygon
            key={i}
            points="0,-2.2 0.65,-0.7 2.2,-0.7 0.95,0.3 1.4,1.8 0,0.9 -1.4,1.8 -0.95,0.3 -2.2,-0.7 -0.65,-0.7"
            transform={`translate(${cx}, ${cy})`}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Official Igalia vector mark (using authentic official brand asset)
 */
function IgaliaLogo() {
  return (
    <Image
      src="/logos/igalia.png"
      alt="Igalia"
      width={96}
      height={96}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "50%",
        display: "block",
      }}
    />
  );
}

/**
 * Official Processing Foundation vector mark (matching exact official brand identity)
 */
function ProcessingFoundationLogo() {
  return (
    <svg
      viewBox="0 0 800 800"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top-Center Violet Curve */}
      <path
        d="M400 100C300 400 600 300 600 600"
        stroke="#9C4BFF"
        strokeWidth="150"
      />
      {/* Dark Purple S-Ribbon */}
      <path
        d="M600 100C700 600 100 300 100 700"
        stroke="#5501A4"
        strokeWidth="150"
      />
      {/* Lavender Diagonal Bar */}
      <path
        d="M100 300L400 700"
        stroke="#D4B2FE"
        strokeWidth="150"
      />
    </svg>
  );
}

/**
 * Official Open Source Promotion Plan (OSPP) mark (from official summer-ospp assets)
 */
function OsppLogo() {
  return (
    <Image
      src="/logos/ospp.png"
      alt="OSPP"
      width={96}
      height={96}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "50%",
        display: "block",
      }}
    />
  );
}

/**
 * Official Code for GovTech (C4GT) mark (from official CodeForGoodTech assets)
 */
function C4gtLogo() {
  return (
    <Image
      src="/logos/c4gt.png"
      alt="C4GT"
      width={96}
      height={96}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "50%",
        display: "block",
      }}
    />
  );
}

function renderProgramIcon(slug: string) {
  const norm = slug.toLowerCase();
  switch (norm) {
    case "gsoc":
    case "google-summer-of-code":
      return <GsocLogo />;
    case "lfx":
    case "lfx-mentorship":
    case "linux-foundation":
      return <LfxLogo />;
    case "summer-of-bitcoin":
    case "sob":
      return <BitcoinLogo />;
    case "esoc":
    case "european-summer-of-code":
      return <EsocLogo />;
    case "igalia":
    case "igalia-coding-experience":
      return <IgaliaLogo />;
    case "outreachy":
      return <OutreachyLogo />;
    case "processing-foundation":
    case "processing":
    case "processingfoundation":
      return <ProcessingFoundationLogo />;
    case "season-of-docs":
    case "gsod":
      return <SeasonOfDocsLogo />;
    case "mlh":
    case "mlh-fellowship":
      return <MlhLogo />;
    case "ospp":
    case "open-source-promotion-plan":
    case "summer-ospp":
      return <OsppLogo />;
    case "c4gt":
    case "code-for-govtech":
    case "code-for-good-tech":
      return <C4gtLogo />;
    case "cncf":
    case "cloud-native":
      return <CncfLogo />;
    default:
      return null;
  }
}

export function ProgramMark({ slug, name }: { slug: string; name?: string }) {
  const d = programDef(slug);
  const icon = renderProgramIcon(slug);
  const label = d ? monogram(d) : (name ?? slug).slice(0, 2).toUpperCase();

  return (
    <span className={`mark mark-${slug}`} aria-hidden="true" title={d?.name ?? name}>
      {icon ? (
        <span className="mark-icon-wrap">{icon}</span>
      ) : (
        <span className="mark-label">{label}</span>
      )}
    </span>
  );
}

export const PROGRAM_SLUGS = PROGRAM_CATALOG.map((p) => p.slug);
