import { z } from "zod";
import type { GitProvider, GitUrlDetails } from "@atlas-nexus/types";

export const grantIdSchema = z.uuid();
export const childNameInputSchema = z.object({ grantId: grantIdSchema, childName: z.string().max(120) }).strict();
export const grantInputSchema = z.object({ grantId: grantIdSchema }).strict();
export const openFolderInputSchema = z.object({ grantId: grantIdSchema, childName: z.string().max(120).optional() }).strict();
export const settingsUpdateSchema = z.object({ theme: z.enum(["system", "dark", "light"]).optional() }).strict();
export const cloneStartSchema = z.object({ sourceUrl: z.string().max(2048), mode: z.enum(["snapshot", "full", "mirror"]), grantId: grantIdSchema, childName: z.string().max(120), confirmed: z.literal(true), retryOfJobId: z.uuid().optional() }).strict();
export const cloneJobInputSchema = z.object({ jobId: z.uuid() }).strict();
export const cloneRetrySchema = z.object({ jobId: z.uuid(), grantId: grantIdSchema, childName: z.string().max(120), confirmed: z.literal(true) }).strict();

export const SUPPORTED_GIT_PROVIDERS: ReadonlyArray<{ id: GitProvider; label: string; hostname: string; nestedNamespaces: boolean }> = Object.freeze([
  { id: "github", label: "GitHub", hostname: "github.com", nestedNamespaces: false },
  { id: "gitlab", label: "GitLab", hostname: "gitlab.com", nestedNamespaces: true },
  { id: "codeberg", label: "Codeberg", hostname: "codeberg.org", nestedNamespaces: false },
  { id: "gitea", label: "Gitea", hostname: "gitea.com", nestedNamespaces: false },
  { id: "forgejo", label: "Forgejo Next", hostname: "v15.next.forgejo.org", nestedNamespaces: false }
]);

export function parseGitRemoteUrl(input: string): GitUrlDetails {
  if (input.length > 2048 || /[\u0000-\u0020\u007f\\%]/.test(input)) throw new Error("Enter a valid supported HTTPS repository URL without encoding, whitespace, or backslashes.");
  // Inspect the original path before WHATWG URL normalization removes dot segments.
  const raw = /^https:\/\/[^/?#]+(\/[^?#]*)$/i.exec(input);
  if (!raw) throw new Error("Only public HTTPS repository URLs from the five approved providers are supported.");
  const rawPath = raw[1]!.replace(/\/$/, "");
  const parts = rawPath.slice(1).split("/");
  const segment = /^[A-Za-z0-9_.-]+$/;
  if (!parts.every(value => segment.test(value) && value !== "." && value !== ".." && value !== "-")) {
    throw new Error("The repository namespace or name is invalid.");
  }
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid supported HTTPS repository URL."); }
  const provider = SUPPORTED_GIT_PROVIDERS.find(candidate => candidate.hostname === url.hostname.toLowerCase());
  if (url.protocol !== "https:" || !provider || url.port || url.username || url.password || url.search || url.hash) {
    throw new Error("Only public HTTPS repository URLs from the five approved providers are supported.");
  }
  if (parts.length < 2 || (!provider.nestedNamespaces && parts.length !== 2)) throw new Error(`Use a valid ${provider.label} repository URL.`);
  const rawRepository = parts.at(-1) ?? "";
  if (/\.git\.git$/i.test(rawRepository)) throw new Error("The repository suffix is invalid.");
  const repository = rawRepository.replace(/\.git$/i, "");
  const namespaceParts = parts.slice(0, -1);
  if (![...namespaceParts, repository].every(value => segment.test(value) && value !== "." && value !== "..")) {
    throw new Error("The repository namespace or name is invalid.");
  }
  const namespace = namespaceParts.join("/");
  return { normalizedUrl: `https://${provider.hostname}/${namespace}/${repository}.git`, provider: provider.id, providerLabel: provider.label, hostname: provider.hostname, namespace, owner: namespaceParts[0]!, repository };
}

export function parseGitHubUrl(input: string): GitUrlDetails {
  const result = parseGitRemoteUrl(input);
  if (result.provider !== "github") throw new Error("Only public GitHub HTTPS repository URLs are supported by this compatibility parser.");
  return result;
}
