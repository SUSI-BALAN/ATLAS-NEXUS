export type ThemePreference = "system" | "dark" | "light";
export type CloneMode = "snapshot" | "full" | "mirror";

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
  cloneEngineAvailable: false;
}

export interface GitUrlDetails { normalizedUrl: string; owner: string; repository: string }

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
  folderOpen: "nexus:folder:open"
} as const;
