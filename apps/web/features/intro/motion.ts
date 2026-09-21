/** Motion tuning for the intro stage. Everything is in one place; values are deliberately small. */
export const INTRO_MOTION = {
  /** Fraction of the remaining distance covered per frame (0-1). Lower is smoother and slower. */
  follow: 0.06,
  /** Max pixel pull of the CTA toward the cursor while it is near. */
  magnet: 5,
  /** Distance in px around the CTA within which it feels the cursor. */
  magnetRange: 110,
  /** Duration of the exit transition before navigating. */
  leaveMs: 320,
} as const;
