import { join } from "node:path";

export function preloadPath(mainDirectory: string): string {
  return join(mainDirectory, "../preload/index.cjs");
}
