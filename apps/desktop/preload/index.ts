import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type NexusApi } from "@atlas-nexus/types";

const invoke = <K extends keyof NexusApi>(channel: string, input?: unknown): ReturnType<NexusApi[K]> => ipcRenderer.invoke(channel, input) as ReturnType<NexusApi[K]>;

const api: NexusApi = Object.freeze({
  getAppStatus: () => invoke<"getAppStatus">(IPC_CHANNELS.appStatus),
  getSettings: () => invoke<"getSettings">(IPC_CHANNELS.settingsGet),
  updateSettings: (input: Parameters<NexusApi["updateSettings"]>[0]) => invoke<"updateSettings">(IPC_CHANNELS.settingsUpdate, input),
  selectParentFolder: () => invoke<"selectParentFolder">(IPC_CHANNELS.folderSelect),
  restorePreferredFolder: () => invoke<"restorePreferredFolder">(IPC_CHANNELS.folderRestore),
  getFolderInfo: (input: Parameters<NexusApi["getFolderInfo"]>[0]) => invoke<"getFolderInfo">(IPC_CHANNELS.folderInfo, input),
  previewDestination: (input: Parameters<NexusApi["previewDestination"]>[0]) => invoke<"previewDestination">(IPC_CHANNELS.folderPreview, input),
  createChildFolder: (input: Parameters<NexusApi["createChildFolder"]>[0]) => invoke<"createChildFolder">(IPC_CHANNELS.folderCreate, input),
  savePreferredFolder: (input: Parameters<NexusApi["savePreferredFolder"]>[0]) => invoke<"savePreferredFolder">(IPC_CHANNELS.folderSave, input),
  openFolder: (input: Parameters<NexusApi["openFolder"]>[0]) => invoke<"openFolder">(IPC_CHANNELS.folderOpen, input),
  startClone: (input: Parameters<NexusApi["startClone"]>[0]) => invoke<"startClone">(IPC_CHANNELS.cloneStart, input),
  listCloneJobs: () => invoke<"listCloneJobs">(IPC_CHANNELS.cloneList),
  cancelClone: (input: Parameters<NexusApi["cancelClone"]>[0]) => invoke<"cancelClone">(IPC_CHANNELS.cloneCancel, input),
  retryClone: (input: Parameters<NexusApi["retryClone"]>[0]) => invoke<"retryClone">(IPC_CHANNELS.cloneRetry, input)
});

contextBridge.exposeInMainWorld("nexus", api);
