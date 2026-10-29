// Contract for the AI structured-import service ("智能导入").
import type { ImportStructureResult } from "@/types";

export interface AiImportRequest {
  rawText: string;
  titleHint?: string;
  artistHint?: string;
}

export interface IAiImportService {
  structure(request: AiImportRequest, signal?: AbortSignal): Promise<ImportStructureResult>;
}
