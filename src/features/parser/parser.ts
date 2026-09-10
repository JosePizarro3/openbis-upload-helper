import { invoke } from "@tauri-apps/api/core";


export interface ParserInfo {
  id: string;
  name: string;
  description: string;
  version?: string;
}


export interface ParsersResult {
  success: boolean;
  parsers: ParserInfo[];
  error?: string;
}


export async function getParsers(): Promise<ParsersResult> {
  return invoke<ParsersResult>(
    "get_parsers",
  );
}