# dsh-whale-companion

[English](README.md) | 中文

这是一个本地优先的 DSH 鲸鱼世界，含安全潮汐反应、20 种鲸灵、24 件海湾纪念物、温柔远征、访客瓶和主动加入的本地鲸群卡片。

## 功能

- `shell.overlay` 鲸鱼支持键盘、拖动、边缘吸附、视口安全位置，并通过一个共享 store 每 5 秒刷新。新潮汐会变成有时限的可见气泡，只有里程碑进入读屏 live region。
- 安静、标准、热闹三档偏好只保存在浏览器，不进入 Host、备份或鲸群卡片。鲸鱼小屋新增七日航海日志、当前故事、海湾预览和隐私账本。
- 20 种鲸灵由 manifest 映射到安全的 live 事件家族与潮汐效果，不读取事件内容，也不改变模型行为。
- 潮汐由会话开始、用户回合和工具结果生成，并有本地上限。重复工具结果不能刷纪念物或远征。
- 鲸鱼小屋提供本地 SVG 明信片、8 个固定插槽、3 个小屋方案、24 件纪念物与无惩罚远征。
- 访客瓶是严格校验的只读本地预览。鲸群卡片需要主动开启，只经由本地文件交换，不联网也不接受自由文本。

## 隐私

Host 只读取会话 id、序号、类型和时间戳。它不会读取或保留提示词、助手输出、源代码、路径、工具参数或工具结果。

Host 为当前进程的 live 去重生成 HMAC 归一化收据摘要。持久化窗口最多保留 4,096 条，不承诺永久 exactly-once。备份不含收据摘要、会话 id 或事件 payload；明信片、访客瓶和鲸群卡片都采用严格的本地 schema，绝不包含任务或会话内容。

## 安装

构建 tarball 后安装到 DSH Web profile：

```powershell
npm pack . --pack-destination ../../dist
dsh plugin --profile web add ../../dist/dsh-whale-companion-2.1.1.tgz
```

重启原有 DSH Web 进程并刷新页面。环境要求和验收步骤见[套件安装指南](../../INSTALL.zh-CN.md)。

## 模型体验

本插件不会增加模型提示、工具、消息、token 消耗或 KV cache 内容；只在 Host 观察已提交的会话事件元数据，并提供浏览器界面。

## 已知限制

进度只保存在一个本地存储后端。当前 Host Remote 事件白名单没有鲸鱼状态推送路由，因此插件每 5 秒轮询。鲸群卡片只支持本地交换；托管社区需要独立负责认证、留存、删除、限流和审核的传输服务。

## 开发

在工作区根目录运行 `corepack pnpm typecheck`、`corepack pnpm test`、`corepack pnpm build` 和 `corepack pnpm pack:check`。

MIT，见 [LICENSE](LICENSE)。
