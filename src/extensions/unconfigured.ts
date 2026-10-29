import type { AiImportAdapter, AppSession, AuthAdapter, QuotaAdapter } from "./types";

const unavailable = (feature: string) =>
  new Error(`${feature}尚未配置。请参考 docs/HOSTED_FEATURES.md 接入你自己的服务端。`);

export const unconfiguredAuthAdapter: AuthAdapter = {
  configured: false,
  async getSession(): Promise<AppSession | null> {
    return null;
  },
  subscribe() {
    return () => undefined;
  },
  async signInWithOAuth() {
    throw unavailable("登录服务");
  },
  async signInWithEmail() {
    throw unavailable("登录服务");
  },
  async signUpWithEmail() {
    throw unavailable("登录服务");
  },
  async signOut() {
    throw unavailable("登录服务");
  },
};

export const unconfiguredAiImportAdapter: AiImportAdapter = {
  configured: false,
  async structure() {
    throw unavailable("AI 智能导入");
  },
};

export const unconfiguredQuotaAdapter: QuotaAdapter = {
  configured: false,
  async getQuota() {
    throw unavailable("AI 使用额度");
  },
};
