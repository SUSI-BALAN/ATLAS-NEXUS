import { createHash } from "node:crypto";
import type { Session } from "electron";

// Keep this byte-for-byte aligned with @vitejs/plugin-react's preamble for base "/".
// contentSecurityPolicy.test.ts fails if the installed plugin changes it.
export const VITE_REACT_REFRESH_PREAMBLE = `import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`;

export const VITE_REACT_REFRESH_PREAMBLE_HASH = createHash("sha256")
  .update(VITE_REACT_REFRESH_PREAMBLE)
  .digest("base64");

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
];

function contentSecurityPolicy(development: boolean): string {
  const scriptSources = development ? `'self' 'sha256-${VITE_REACT_REFRESH_PREAMBLE_HASH}'` : "'self'";
  const connectSources = development
    ? "'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"
    : "'self'";

  return [
    BASE_DIRECTIVES[0],
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    BASE_DIRECTIVES[1],
    BASE_DIRECTIVES[2],
    `connect-src ${connectSources}`,
    ...BASE_DIRECTIVES.slice(3)
  ].join("; ");
}

export const PRODUCTION_CONTENT_SECURITY_POLICY = contentSecurityPolicy(false);
export const DEVELOPMENT_CONTENT_SECURITY_POLICY = contentSecurityPolicy(true);
export const CONTENT_SECURITY_POLICY = PRODUCTION_CONTENT_SECURITY_POLICY;

export function usesDevelopmentContentSecurityPolicy(isPackaged: boolean, rendererUrl: string | undefined): boolean {
  return !isPackaged && Boolean(rendererUrl);
}

export function installContentSecurityPolicy(target: Pick<Session, "webRequest">, development = false): void {
  const policy = development ? DEVELOPMENT_CONTENT_SECURITY_POLICY : PRODUCTION_CONTENT_SECURITY_POLICY;
  target.webRequest.onHeadersReceived({ urls: ["file://*", "http://127.0.0.1/*", "http://localhost/*"] }, (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy]
      }
    });
  });
}
