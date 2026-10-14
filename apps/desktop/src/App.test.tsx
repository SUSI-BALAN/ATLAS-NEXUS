// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, AppStatus, NexusApi } from "@atlas-nexus/types";
import { App } from "./App";

const ok = <T,>(data: T) => ({ ok: true as const, data, requestId: "request" });
const api: NexusApi = {
  getAppStatus: vi.fn(async () => ok<AppStatus>({ version: "0.1.0", platform: "win32", databaseReady: true, databasePath: "C:\\Data\\nexus.sqlite", cloneEngineAvailable: true })),
  getSettings: vi.fn(async () => ok<AppSettings>({ theme: "dark", preferredFolderPath: null })),
  updateSettings: vi.fn(async input => ok({ theme: input.theme ?? "dark", preferredFolderPath: null })),
  selectParentFolder: vi.fn(async () => ok(null)), restorePreferredFolder: vi.fn(async () => ok(null)),
  getFolderInfo: vi.fn(), previewDestination: vi.fn(), createChildFolder: vi.fn(), savePreferredFolder: vi.fn(), openFolder: vi.fn(),
  startClone: vi.fn(), listCloneJobs: vi.fn(async () => ok({ jobs: [], counts: { Queued: 0, Validating: 0, Downloading: 0, Verifying: 0, Completed: 0, Partial: 0, Failed: 0, Cancelled: 0, Interrupted: 0 } })), cancelClone: vi.fn(), retryClone: vi.fn()
};

beforeEach(() => { Object.defineProperty(window, "nexus", { configurable: true, value: api }); });
afterEach(() => cleanup());

describe("App navigation and honest states", () => {
  it("renders the empty dashboard without fabricated jobs", async () => {
    render(<App />);
    expect(await screen.findByText("0 completed")).toBeInTheDocument();
    expect(screen.getByText("0 active · persisted SQLite data")).toBeInTheDocument();
  });
  it("navigates to a clearly marked unimplemented page", async () => {
    render(<App />); await userEvent.click(screen.getByRole("button", { name: /AI Research/i }));
    expect(screen.getByText("AI is disabled")).toBeInTheDocument();
    expect(screen.getByText("Future stage")).toBeInTheDocument();
  });
  it("rejects an unsafe clone URL and keeps clone execution disabled", async () => {
    render(<App />); await userEvent.click(screen.getByRole("button", { name: /Clone from URL/i }));
    await userEvent.type(screen.getByLabelText("GitHub repository URL"), "file:///c:/private");
    expect(await screen.findByText(/Only public GitHub HTTPS/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start clone" })).toBeDisabled();
  });
});
