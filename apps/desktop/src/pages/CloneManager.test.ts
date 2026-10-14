import { describe, expect, it } from "vitest";
import type { CloneJob, CloneJobStatus } from "@atlas-nexus/types";
import { jobProgressPresentation } from "./CloneManager.js";

describe("Clone Manager progress truthfulness", () => {
  it.each<CloneJobStatus>(["Failed", "Cancelled", "Interrupted", "Partial"])("never presents retained 100 percent as success for %s", status => {
    expect(jobProgressPresentation(job({ status, progressPercent: 100 }))).toEqual({ kind: "terminal", label: `${status}: not completed` });
  });

  it("shows 100 percent only for a completed and verified job", () => {
    expect(jobProgressPresentation(job({ status: "Completed", progressPercent: 12 }))).toEqual({ kind: "completed", label: "Completed and verified: 100%" });
  });
});

function job(overrides: Partial<CloneJob>): CloneJob {
  return {
    id: "11111111-1111-4111-8111-111111111111", sourceUrl: "https://github.com/octocat/Hello-World.git", provider: "github", namespace: "octocat", repositoryName: "Hello-World", mode: "full", destinationPath: "D:\\Repos\\fixture",
    status: "Failed", phase: "Failed", progressPercent: null, resolvedCommit: null, verificationSummary: null, errorCode: null, errorMessage: null,
    retryOfJobId: null, createdAt: "2026-10-14T00:00:00.000Z", updatedAt: "2026-10-14T00:00:00.000Z", startedAt: null, completedAt: null, ...overrides
  };
}
