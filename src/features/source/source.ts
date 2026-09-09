import { invoke } from "@tauri-apps/api/core";


export type SourceNodeKind =
  | "file"
  | "directory";


export interface SourceNode {
  name: string;
  path: string;
  kind: SourceNodeKind;
  children: SourceNode[];

//   parser?: string;
//   parserInherited?: boolean;

//   status?: "pending" | "parsed" | "error";
}


export async function scanSources(
  paths: string[],
): Promise<SourceNode[]> {
  return invoke<SourceNode[]>(
    "scan_sources",
    { paths },
  );
}