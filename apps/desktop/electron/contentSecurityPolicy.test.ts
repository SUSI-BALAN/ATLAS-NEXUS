import { describe, expect, it, vi } from "vitest";
import { CONTENT_SECURITY_POLICY, installContentSecurityPolicy } from "./contentSecurityPolicy.js";

describe("content security policy", () => {
  it("delivers frame ancestry protection as a response header", () => {
    let listener: ((details: { responseHeaders?: Record<string, string[]> }, callback: (result: unknown) => void) => void) | undefined;
    const onHeadersReceived = vi.fn((_filter, callback) => { listener = callback; });
    const target = { webRequest: { onHeadersReceived } } as unknown as Parameters<typeof installContentSecurityPolicy>[0];
    installContentSecurityPolicy(target);
    expect(onHeadersReceived).toHaveBeenCalledWith({ urls: ["file://*", "http://127.0.0.1/*", "http://localhost/*"] }, expect.any(Function));
    const callback = vi.fn();
    listener?.({ responseHeaders: { Existing: ["value"] } } as never, callback);
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(callback).toHaveBeenCalledWith({ responseHeaders: { Existing: ["value"], "Content-Security-Policy": [CONTENT_SECURITY_POLICY] } });
  });
});
