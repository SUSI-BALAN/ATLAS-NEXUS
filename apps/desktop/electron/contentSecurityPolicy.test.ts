import { describe, expect, it, vi } from "vitest";
import react from "@vitejs/plugin-react";
import {
  DEVELOPMENT_CONTENT_SECURITY_POLICY,
  PRODUCTION_CONTENT_SECURITY_POLICY,
  VITE_REACT_REFRESH_PREAMBLE,
  VITE_REACT_REFRESH_PREAMBLE_HASH,
  installContentSecurityPolicy
} from "./contentSecurityPolicy.js";

function captureInstalledPolicy(development = false): string {
  let listener: ((details: { responseHeaders?: Record<string, string[]> }, callback: (result: { responseHeaders: Record<string, string[]> }) => void) => void) | undefined;
  const onHeadersReceived = vi.fn((_filter, callback) => { listener = callback; });
  const target = { webRequest: { onHeadersReceived } } as unknown as Parameters<typeof installContentSecurityPolicy>[0];
  installContentSecurityPolicy(target, development);
  expect(onHeadersReceived).toHaveBeenCalledWith({ urls: ["file://*", "http://127.0.0.1/*", "http://localhost/*"] }, expect.any(Function));
  let installed = "";
  listener?.({ responseHeaders: { Existing: ["value"] } } as never, result => {
    expect(result.responseHeaders.Existing).toEqual(["value"]);
    const values = result.responseHeaders["Content-Security-Policy"];
    expect(values).toHaveLength(1);
    installed = values?.[0] ?? "";
  });
  return installed;
}

describe("content security policy", () => {
  it("matches the exact installed Vite React Refresh preamble and its SHA-256", async () => {
    expect(VITE_REACT_REFRESH_PREAMBLE).toBe(react.preambleCode.replace("__BASE__", "/"));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(react.preambleCode.replace("__BASE__", "/")));
    expect(VITE_REACT_REFRESH_PREAMBLE_HASH).toBe(Buffer.from(digest).toString("base64"));
  });

  it("allows only the preamble hash and loopback HMR connections in development", () => {
    expect(captureInstalledPolicy(true)).toBe(DEVELOPMENT_CONTENT_SECURITY_POLICY);
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toContain(`script-src 'self' 'sha256-${VITE_REACT_REFRESH_PREAMBLE_HASH}'`);
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toContain("connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*");
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
    expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("keeps production free of development script and connection exceptions", () => {
    expect(captureInstalledPolicy()).toBe(PRODUCTION_CONTENT_SECURITY_POLICY);
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("connect-src 'self'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain("sha256-");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain("localhost");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain("127.0.0.1");
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain("ws:");
  });
});
