import { invoke } from "@tauri-apps/api/core";


export interface SpacesResult {
  success: boolean;
  spaces: string[];
  error?: string;
}


export async function getSpaces(): Promise<SpacesResult> {
  return invoke<SpacesResult>("get_spaces");
}