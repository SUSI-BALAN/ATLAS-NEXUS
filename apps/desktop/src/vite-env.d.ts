/// <reference types="vite/client" />
import type { NexusApi } from "@atlas-nexus/types";

declare global { interface Window { nexus: NexusApi } }
export {};
