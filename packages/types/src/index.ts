export type ThemePreference = "system" | "dark" | "light";
export type CloneMode = "snapshot" | "full" | "mirror";
export type CloneJobStatus = "Queued" | "Validating" | "Downloading" | "Verifying" | "Completed" | "Partial" | "Failed" | "Cancelled" | "Interrupted";

export type ErrorCode =
  | "CANCELLED"
  | "INVALID_INPUT"
  | "INVALID_FOLDER_NAME"
  | "INVALID_PARENT"
  | "GRANT_NOT_FOUND"
  | "PATH_UNAVAILABLE"
  | "PATH_COLLISION"
  | "PERMISSION_DENIED"
  | "UNSUPPORTED_PATH"
  | "DATABASE_UNAVAILABLE"
  | "CLONE_UNAVAILABLE"
  | "PRIVATE_REPOSITORY"
  | "REPOSITORY_UNAVAILABLE"
  | "TRANSPORT_ERROR"
  | "NETWORK_ERROR"
  | "DOWNLOAD_TIMEOUT"
  | "RESOURCE_LIMIT"
  | "VERIFICATION_FAILED"
  | "INTERNAL_ERROR";

export interface SafeError { code: ErrorCode; message: string; requestId: string }
export type Result<T> = { ok: true; data: T; requestId: string } | { ok: false; error: SafeError };

export interface FolderGrant {
  id: string;
  path: string;
  name: string;
  availableBytes: number | null;
  totalBytes: number | null;
}

export interface DestinationPreview {
  parentPath: string;
  childName: string;
  destinationPath: string;
  exists: boolean;
  valid: boolean;
  message: string;
}

export interface AppSettings {
  theme: ThemePreference;
  preferredFolderPath: string | null;
}

export interface AppStatus {
  version: string;
  platform: string;
  databaseReady: boolean;
  databasePath: string;
  cloneEngineAvailable: boolean;
}

export interface GitUrlDetails { normalizedUrl: string; owner: string; repository: string }

export interface CloneJob {
  id: string;
  sourceUrl: string;
  mode: CloneMode;
  destinationPath: string;
  status: CloneJobStatus;
  phase: string;
  progressPercent: number | null;
  resolvedCommit: string | null;
  verificationSummary: string | null;
  errorCode: ErrorCode | null;
  errorMessage: string | null;
  retryOfJobId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CloneStartInput { sourceUrl: string; mode: CloneMode; grantId: string; childName: string; confirmed: true; retryOfJobId?: string }
export interface CloneJobSummary { jobs: CloneJob[]; counts: Record<CloneJobStatus, number> }

export interface NexusApi {
  getAppStatus(): Promise<Result<AppStatus>>;
  getSettings(): Promise<Result<AppSettings>>;
  updateSettings(input: Partial<Pick<AppSettings, "theme">>): Promise<Result<AppSettings>>;
  selectParentFolder(): Promise<Result<FolderGrant | null>>;
  restorePreferredFolder(): Promise<Result<FolderGrant | null>>;
  getFolderInfo(input: { grantId: string }): Promise<Result<FolderGrant>>;
  previewDestination(input: { grantId: string; childName: string }): Promise<Result<DestinationPreview>>;
  createChildFolder(input: { grantId: string; childName: string }): Promise<Result<DestinationPreview>>;
  savePreferredFolder(input: { grantId: string }): Promise<Result<AppSettings>>;
  openFolder(input: { grantId: string; childName?: string }): Promise<Result<null>>;
  startClone(input: CloneStartInput): Promise<Result<CloneJob>>;
  listCloneJobs(): Promise<Result<CloneJobSummary>>;
  cancelClone(input: { jobId: string }): Promise<Result<CloneJob>>;
  retryClone(input: { jobId: string; grantId: string; childName: string; confirmed: true }): Promise<Result<CloneJob>>;
}

export const IPC_CHANNELS = {
  appStatus: "nexus:app-status",
  settingsGet: "nexus:settings:get",
  settingsUpdate: "nexus:settings:update",
  folderSelect: "nexus:folder:select",
  folderRestore: "nexus:folder:restore",
  folderInfo: "nexus:folder:info",
  folderPreview: "nexus:folder:preview",
  folderCreate: "nexus:folder:create",
  folderSave: "nexus:folder:save",
  folderOpen: "nexus:folder:open",
  cloneStart: "nexus:clone:start",
  cloneList: "nexus:clone:list",
  cloneCancel: "nexus:clone:cancel",
  cloneRetry: "nexus:clone:retry"
} as const;
