import { describe, expect, it } from "vitest";
import { resolveChildPath, validateWindowsFolderName } from "./index.js";

describe("Windows folder policy", () => {
  it.each(["GPT-Researcher", "atlas_nexus", "Project 2026"])("accepts %s", name => expect(validateWindowsFolderName(name)).toBe(name));
  it.each(["", ".", "..", "a..b", "CON", "con.txt", "NUL", "COM1", "LPT9.log", "bad/name", "bad\\name", "bad:name", "trailing.", " trailing", "trailing "])("rejects %s", name => expect(() => validateWindowsFolderName(name)).toThrow());
  it("resolves a child beneath the approved parent", () => expect(resolveChildPath("D:\\Projects", "GPT-Researcher")).toBe("D:\\Projects\\GPT-Researcher"));
  it("rejects device namespaces", () => expect(() => resolveChildPath("\\\\?\\D:\\Projects", "repo")).toThrow());
});
