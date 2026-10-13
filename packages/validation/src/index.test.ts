import { describe, expect, it } from "vitest";
import { parseGitHubUrl } from "./index.js";

describe("parseGitHubUrl", () => {
  it.each([
    ["https://github.com/openai/openai-node", "https://github.com/openai/openai-node.git"],
    ["https://github.com/assafelovic/gpt-researcher.git", "https://github.com/assafelovic/gpt-researcher.git"]
  ])("normalizes %s", (input, expected) => expect(parseGitHubUrl(input).normalizedUrl).toBe(expected));

  it.each(["http://github.com/a/b", "git@github.com:a/b.git", "https://user:pass@github.com/a/b", "file:///c:/repo", "https://github.com/a/b/issues", "https://github.com/a%2fb/c", "https://gitlab.com/a/b"])("rejects %s", input => expect(() => parseGitHubUrl(input)).toThrow());
});
