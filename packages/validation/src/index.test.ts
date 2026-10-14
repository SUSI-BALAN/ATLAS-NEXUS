import { describe, expect, it } from "vitest";
import { parseGitHubUrl, parseGitRemoteUrl, SUPPORTED_GIT_PROVIDERS } from "./index.js";

describe("parseGitHubUrl", () => {
  it.each([
    ["https://github.com/openai/openai-node", "https://github.com/openai/openai-node.git"],
    ["https://github.com/assafelovic/gpt-researcher.git", "https://github.com/assafelovic/gpt-researcher.git"]
  ])("normalizes %s", (input, expected) => expect(parseGitHubUrl(input).normalizedUrl).toBe(expected));

  it.each(["http://github.com/a/b", "git@github.com:a/b.git", "https://user:pass@github.com/a/b", "file:///c:/repo", "https://github.com/a/b/issues", "https://github.com/a%2fb/c", "https://gitlab.com/a/b"])("rejects %s", input => expect(() => parseGitHubUrl(input)).toThrow());
});

describe("parseGitRemoteUrl", () => {
  it.each([
    ["https://github.com/openai/openai-node", "github", "openai", "openai-node"],
    ["https://gitlab.com/gitlab-org/security-products/analyzers/gemnasium.git", "gitlab", "gitlab-org/security-products/analyzers", "gemnasium"],
    ["https://codeberg.org/ciphel/01Hello_World", "codeberg", "ciphel", "01Hello_World"],
    ["https://gitea.com/apachenpub/accept-test.git", "gitea", "apachenpub", "accept-test"],
    ["https://v15.next.forgejo.org/kavemand/.forgejo.git", "forgejo", "kavemand", ".forgejo"]
  ])("normalizes %s", (input, provider, namespace, repository) => expect(parseGitRemoteUrl(input)).toMatchObject({ provider, namespace, repository }));

  it("contains exactly the approved provider allowlist", () => {
    expect(SUPPORTED_GIT_PROVIDERS.map(provider => provider.hostname)).toEqual(["github.com", "gitlab.com", "codeberg.org", "gitea.com", "v15.next.forgejo.org"]);
  });

  it.each(["http://github.com/a/b", "git@github.com:a/b.git", "https://user:pass@github.com/a/b", "file:///c:/repo", "https://github.com/a/b/issues", "https://github.com/a%2fb/c", "https://github.com/a/%2e%2e", "https://github.com:444/a/b", "https://github.example/a/b", "https://forgejo.org/a/b", "https://codeberg.org/a/b/c", "https://github.com/a/b?download=1", "https://github.com/a/b.git.git"])("rejects %s", input => expect(() => parseGitRemoteUrl(input)).toThrow());

  it.each([
    "https://github.com/a/../owner/repo", "https://github.com/a/%2e%2e/owner/repo",
    "https://github.com/owner/./repo", "https://github.com/owner\\repo", "https://%67ithub.com/owner/repo",
    "https://gitlab.com/group//subgroup/repo", "https://gitlab.com/group/repo/-/tree/main",
    "https://github.com/owner/repo?", "https://github.com/owner/repo#", " https://github.com/owner/repo"
  ])("rejects ambiguous original URL %s before normalization", input => expect(() => parseGitRemoteUrl(input)).toThrow());
});
