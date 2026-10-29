import type { AiImportRequest } from "@/services/ai-import";
import type { ImportStructureResult } from "@/types";

export interface AppUser {
  id: string;
  email?: string;
  displayName?: string;
}

export interface AppSession {
  user: AppUser;
}

export interface AiQuota {
  used: number;
  dailyLimit: number;
  unlimited: boolean;
  remaining: number | null;
  /** Human-readable reset rule, for example "北京时间每天 00:00". */
  resetDescription?: string;
}

export interface AuthAdapter {
  /** False means that this build intentionally has no account backend. */
  configured: boolean;
  getSession(): Promise<AppSession | null>;
  subscribe(listener: (session: AppSession | null) => void): () => void;
  signInWithOAuth(provider: "google"): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<{ confirmationRequired: boolean }>;
  signOut(): Promise<void>;
}

export interface AiImportAdapter {
  /** False means that this build intentionally has no AI backend. */
  configured: boolean;
  structure(request: AiImportRequest): Promise<ImportStructureResult>;
}

export interface QuotaAdapter {
  /** False means that this build intentionally has no quota backend. */
  configured: boolean;
  getQuota(): Promise<AiQuota>;
}
