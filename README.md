# 音咏 OtoYomi Web

一个面向日语歌曲跟唱与歌词学习的本地优先 Web 应用。它支持本地曲库、合集、歌词编辑、练习、备份恢复、在线歌词搜索，以及在浏览器中生成日文读音、罗马音和中文音译。

本仓库是可公开审计的前端与本地算法版本。它**不包含**线上产品使用的账户服务、AI API Key、额度数据库、白名单、生产项目 ID、部署密钥或其他私有后端实现。

## 已包含的功能

- 本地曲库、合集和练习设置，数据保存在 IndexedDB
- 手动输入、交替粘贴、TXT/DOCX 文件导入
- 通过 LRCLIB 搜索公开歌词结果
- Kuromoji/IPADIC 日文分词与读音
- 假名转罗马音、罗马音转中文音译
- 补充读音与个人发音字典
- 导入校对、问题标记、歌词编辑
- 曲库 JSON 备份与恢复
- 单元测试、构建校验和 Kuromoji 字典完整性检查

## 未包含的托管功能

- 登录、注册和 OAuth 后端
- AI 智能导入服务端与任何模型密钥
- 每日额度、白名单、用户数据库和管理后台
- 生产环境配置、域名、日志与用户数据

界面与调用点仍保留为三个适配器。部署者可按 [托管功能接入指南](docs/HOSTED_FEATURES.md) 实现自己的 `AuthAdapter`、`AiImportAdapter` 和 `QuotaAdapter`。

## 本地运行

需要 [Bun](https://bun.sh/) 1.2 或更新版本。

```bash
git clone https://github.com/zhouyalililili/otoyomi-web-open-source.git
cd otoyomi-web-open-source
bun install
bun run dev
```

公开版不需要 `.env`。完整校验：

```bash
bun run test
bun run build
bun run lint
```

更多说明见 [开发与部署指南](docs/DEVELOPMENT.md)；接入自有后端时可参考 [适配器最小示例](docs/ADAPTER_EXAMPLE.md)。

## 数据与网络边界

- 歌曲、歌词、图片、合集、个人字典和设置默认只保存在当前浏览器。
- 在线搜索会把搜索词发送给 LRCLIB；选择结果时会读取对应歌词。
- 日文读音、罗马音和中文音译在浏览器本地生成。
- 未接入自有后端时，账户和 AI 智能导入会明确显示为“未配置”，不会调用隐藏服务。

## 内容与第三方服务

本仓库不附带歌曲、歌词库或音乐文件。歌词及其他内容的权利归各自权利人所有。部署者和使用者应自行确认其数据来源、使用方式及所在地区的合规要求。LRCLIB 是独立第三方服务，不由本项目运营；商用或公开部署前请自行审阅其最新服务条款和数据许可。

第三方组件说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

项目代码使用 [MIT License](LICENSE)。该许可证仅覆盖本仓库代码，不会自动授予歌曲、歌词、字体、第三方 API 数据或商标的权利。
