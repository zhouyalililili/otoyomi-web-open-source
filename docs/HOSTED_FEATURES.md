# 登录、AI 与额度接入指南

公开版有意不提供生产后端。开发者需要实现以下三个适配器，并在 `src/config/services.ts` 中替换默认导出。

## 1. 接口位置

接口定义在 `src/extensions/types.ts`：

- `AuthAdapter`：会话、Google OAuth、邮箱登录/注册、退出
- `AiImportAdapter`：把混合歌词整理成 `ImportStructureResult`
- `QuotaAdapter`：读取当前用户的每日额度

默认实现位于 `src/extensions/unconfigured.ts`。它不会发起网络请求。

## 2. 推荐架构

```text
浏览器
  ├─ AuthAdapter ──────> 你的认证服务
  ├─ QuotaAdapter ─────> 你的业务 API ──> 数据库
  └─ AiImportAdapter ──> 你的业务 API ──> AI 厂商
```

浏览器只持有短期用户会话。AI Key、数据库密码、OAuth client secret 和管理密钥必须只存在于可信服务端。

## 3. 必须满足的安全规则

1. 服务端从经过验证的会话中取得用户 ID，不接受浏览器提交的 `userId`。
2. AI 调用前在数据库中原子校验并扣减额度，避免并发绕过。
3. 额度以服务端时间计算；如采用北京时间重置，应统一使用 `Asia/Shanghai` 日期。
4. 白名单和无限额度只能由管理端修改，客户端字段不具备授权意义。
5. API Key 不得使用 `VITE_` 前缀，不得出现在源码、构建产物、日志或错误响应中。
6. 对歌词文本设置体积上限、超时、速率限制和结构化输出校验。
7. AI 失败时返回可展示的通用错误，不返回厂商响应头、内部地址或堆栈。

## 4. AI 返回契约

`AiImportAdapter.structure()` 应返回：

```ts
{
  title: string;
  artist: string;
  album: string;
  lines: Array<{
    timestampMs?: number | null;
    japanese?: string;
    romaji?: string;
    singAlong?: string;
  }>;
  warnings: string[];
}
```

AI 只建议用于识别标题、歌手、分行和字段归属。日文读音、罗马音和中文音译继续由本项目的本地算法生成。每一行仍会进入校对页；缺失或可疑内容由页面标记给用户修正。

## 5. 组合自己的实现

建立例如 `src/extensions/my-backend.ts`，实现三个接口，然后修改：

```ts
// src/config/services.ts
export {
  myAuthAdapter as authAdapter,
  myAiImportAdapter as aiImportAdapter,
  myQuotaAdapter as quotaAdapter,
} from "@/extensions/my-backend";
```

建议让适配器只调用你自己的 `/api/*`，不要从浏览器直接调用 AI 厂商。

一个使用同源 API 和 `HttpOnly` Cookie 的浏览器端骨架见 [ADAPTER_EXAMPLE.md](ADAPTER_EXAMPLE.md)。该文件只演示接口连接方式，不替代服务端安全实现。

## 6. 数据库建议

最少需要：

- 用户身份映射
- `user_id + usage_date` 唯一的每日使用记录
- 可选的每用户额度覆盖和 `unlimited` 标记
- 管理操作审计记录

仓库不提供生产迁移文件，以免把线上结构、策略或项目绑定误当作通用安全方案。开发者应根据自己的认证和数据库系统创建迁移、行级权限和管理工具。

## 7. 验收清单

- 未登录调用 AI 被服务端拒绝
- 修改请求中的用户 ID 或剩余额度无效
- 并发请求不能突破上限
- 刷新、换浏览器或重新部署不会重置额度
- 白名单、定制上限和无限额度分别生效
- 成功后额度减少一次，失败是否返还需有明确且一致的产品规则
- 切换页面时任务状态保留；成功 toast 有快捷入口，失败 toast 不提供错误跳转
