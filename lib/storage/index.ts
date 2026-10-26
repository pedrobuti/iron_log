export * from "./types";
export { LocalStorageAdapter, isLocalStorageAvailable } from "./local";
export { MemoryStorageAdapter } from "./memory";
export { SupabaseStorageAdapter } from "./supabase";
export { loadAppData, saveAllAppData, createDefaultAppData, mergeDefaultExercises } from "./repository";
