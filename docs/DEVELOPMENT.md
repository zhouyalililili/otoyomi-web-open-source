# 开发与部署指南

## 1. 环境要求

- Bun 1.2+
- 现代浏览器（支持 IndexedDB、Blob 和 ES Modules）
- 如需公开部署，建议使用支持 TanStack Start 的 Node/Bun 运行环境

## 2. 安装和启动

```bash
bun install
bun run dev
```

默认构建不需要环境变量，也不会连接任何账户、AI 或额度后端。

## 3. 常用命令

```bash
bun run test       # 单元测试
bun run build      # 生产构建
bun run preview    # 本地预览构建结果
bun run lint       # ESLint
bun run format     # Prettier
```

## 4. 目录结构

- `src/core`：纯 TypeScript 歌词算法，不访问网络、DOM 或数据库
- `src/services`：LRCLIB、文件读取、Kuromoji 等外部能力封装
- `src/storage`：IndexedDB 与备份恢复
- `src/routes`：页面与导入流程
- `src/extensions`：登录、AI、额度的公开接口和未配置实现
- `src/config/services.ts`：托管服务组合入口
- `public/kuromoji-dict`：浏览器端 Kuromoji 字典

## 5. 部署前检查

1. 运行测试、构建和 lint。
2. 确认 `public/kuromoji-dict` 的 12 个文件均随构建发布。
3. 不要提交 `.env`、私钥、数据库连接串、OAuth client secret 或服务端 API Key。
4. 如果接入托管功能，必须在服务端验证登录身份并原子扣减额度。
5. 设置适合生产环境的 CSP、HTTPS、日志脱敏和速率限制。
6. 阅读 `THIRD_PARTY_NOTICES.md`，自行核对第三方服务的最新条款。

## 6. 本地数据

曲库数据存在 IndexedDB。开发过程中如更改数据结构，应提供兼容迁移；不要通过清空数据库掩盖迁移问题。设置页支持 JSON 备份和恢复，可用于人工验证升级兼容性。
