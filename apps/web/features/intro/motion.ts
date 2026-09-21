/** Motion tuning for the intro stage. Only the background reacts to the cursor; content stays fixed. */
export const INTRO_MOTION = {
  /** Fraction of the remaining distance covered per frame (0-1). Lower is smoother and slower. */
  follow: 0.045,
  /** Duration of the exit transition before navigating. */
  leaveMs: 320,
} as const;
