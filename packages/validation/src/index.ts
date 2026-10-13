import { z } from "zod";
import type { GitUrlDetails } from "@atlas-nexus/types";

export const grantIdSchema = z.uuid();
export const childNameInputSchema = z.object({ grantId: grantIdSchema, childName: z.string().max(120) }).strict();
export const grantInputSchema = z.object({ grantId: grantIdSchema }).strict();
export const openFolderInputSchema = z.object({ grantId: grantIdSchema, childName: z.string().max(120).optional() }).strict();
export const settingsUpdateSchema = z.object({ theme: z.enum(["system", "dark", "light"]).optional() }).strict();

export function parseGitHubUrl(input: string): GitUrlDetails {
  if (input.length > 2048 || /[\u0000-\u001f\u007f]/.test(input)) throw new Error("Enter a valid GitHub HTTPS repository URL.");
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid GitHub HTTPS repository URL."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.port || url.username || url.password || url.search || url.hash) {
    throw new Error("Only public GitHub HTTPS repository URLs are supported in Stage 1.");
  }
  if (/%2f|%5c/i.test(url.pathname)) throw new Error("Encoded path separators are not allowed.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) throw new Error("Use a repository URL in the form https://github.com/owner/repository.git");
  const owner = parts[0] ?? "";
  const repository = (parts[1] ?? "").replace(/\.git$/i, "");
  const segment = /^[A-Za-z0-9_.-]+$/;
  if (!segment.test(owner) || !segment.test(repository) || owner === "." || owner === ".." || repository === "." || repository === "..") {
    throw new Error("The GitHub owner or repository name is invalid.");
  }
  return { normalizedUrl: `https://github.com/${owner}/${repository}.git`, owner, repository };
}
