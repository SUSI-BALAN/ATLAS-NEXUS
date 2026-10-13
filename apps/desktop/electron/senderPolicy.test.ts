import { describe, expect, it } from "vitest";
import { isTrustedIpcSender, type SenderFrameLike } from "./senderPolicy.js";

function event(id: number, url: string, main = true) {
  const mainFrame: SenderFrameLike = { url };
  return { sender: { id, mainFrame }, senderFrame: main ? mainFrame : { url } };
}

describe("IPC sender policy", () => {
  it("accepts only the owning main frame", () => {
    expect(isTrustedIpcSender(event(7, "file:///app/index.html"), 7)).toBe(true);
    expect(isTrustedIpcSender(event(8, "file:///app/index.html"), 7)).toBe(false);
    expect(isTrustedIpcSender(event(7, "file:///app/frame.html", false), 7)).toBe(false);
  });
  it("restricts development requests to the configured origin", () => {
    expect(isTrustedIpcSender(event(7, "http://127.0.0.1:5173/page"), 7, "http://127.0.0.1:5173")).toBe(true);
    expect(isTrustedIpcSender(event(7, "http://evil.test/page"), 7, "http://127.0.0.1:5173")).toBe(false);
  });
});
