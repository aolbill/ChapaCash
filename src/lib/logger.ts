type LogFields = Record<string, unknown>;

const REDACT = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "serverSeed",
  "authorization",
  "cookie",
]);

function sanitize(fields?: LogFields): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = REDACT.has(k) ? "[redacted]" : v;
  }
  return out;
}

function write(level: string, message: string, fields?: LogFields) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitize(fields),
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
