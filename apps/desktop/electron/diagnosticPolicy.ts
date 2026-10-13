const ALLOWED_KEYS = new Set([
  "phase", "name", "type", "reason", "exitCode", "errorCode", "electron", "chrome", "platform"
]);

export function sanitizeDiagnosticDetail(detail: Record<string, unknown>): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 120);
    else if (typeof value === "number" || typeof value === "boolean") safe[key] = value;
  }
  return safe;
}
