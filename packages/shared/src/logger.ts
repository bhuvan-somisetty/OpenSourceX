import pino, { type Logger } from "pino";
import { scrubText } from "./pii";

/** Structured logger. Redacts contact fields and scrubs emails from string arguments. */
export function createLogger(name: string, level = process.env.LOG_LEVEL ?? "info"): Logger {
  return pino({
    name,
    level,
    redact: {
      paths: [
        "email",
        "*.email",
        "lfid",
        "*.lfid",
        "authorization",
        "*.authorization",
        "token",
        "*.token",
      ],
      censor: "[redacted]",
    },
    hooks: {
      logMethod(args, method) {
        const cleaned = args.map((a) => (typeof a === "string" ? scrubText(a) : a));
        return method.apply(this, cleaned as Parameters<typeof method>);
      },
    },
  });
}
export type { Logger };
