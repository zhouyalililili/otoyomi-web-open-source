# 适配器最小示例

下面展示浏览器端适配器如何调用你自己的同源 API。示例使用 `HttpOnly` 会话 Cookie，因此浏览器代码不接触长期令牌。

```ts
import type { AiImportAdapter, AppSession, AuthAdapter, QuotaAdapter } from "@/extensions/types";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `请求失败 (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const listeners = new Set<(session: AppSession | null) => void>();

export const myAuthAdapter: AuthAdapter = {
  configured: true,
  getSession: () => json<AppSession | null>("/api/session"),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async signInWithOAuth() {
    window.location.assign("/api/auth/google/start");
  },
  async signInWithEmail(email, password) {
    const session = await json<AppSession>("/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    listeners.forEach((listener) => listener(session));
  },
  async signUpWithEmail(email, password) {
    return json("/api/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async signOut() {
    await json("/api/auth/sign-out", { method: "POST" });
    listeners.forEach((listener) => listener(null));
  },
};

export const myAiImportAdapter: AiImportAdapter = {
  configured: true,
  structure: (request) => json("/api/ai/import", { method: "POST", body: JSON.stringify(request) }),
};

export const myQuotaAdapter: QuotaAdapter = {
  configured: true,
  getQuota: () => json("/api/ai/quota"),
};
```

服务端端点至少需要遵守以下约定：

| 端点                  | 责任                                  |
| --------------------- | ------------------------------------- |
| `GET /api/session`    | 从安全 Cookie 验证并返回当前会话      |
| `POST /api/auth/*`    | 登录、注册、退出；设置安全 Cookie     |
| `GET /api/ai/quota`   | 从服务端身份读取当日额度              |
| `POST /api/ai/import` | 验证身份、原子扣额、调用 AI、校验输出 |

生产部署还应增加 CSRF 防护、请求体上限、速率限制、超时、审计与错误脱敏。不要直接复制示例作为完整安全后端。
