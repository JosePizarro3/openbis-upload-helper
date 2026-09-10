import {
  invoke,
} from "@tauri-apps/api/core";

import type {
  ProcessingJob,
} from "../parser/processingPlan";


export interface ProcessResult {
  success: boolean;
  processedFiles: number;
  jobs: number;
  error?: string;
}


export interface ProcessRequest {
  space: string;
  project: string;
  collection: string;

  jobs: ProcessingJob[];
}


export async function processSources(
  request: ProcessRequest,
): Promise<ProcessResult> {
  return invoke<ProcessResult>(
    "process_sources",
    {
      space: request.space,
      project: request.project,
      collection: request.collection,
      jobs: request.jobs,
    },
  );
}