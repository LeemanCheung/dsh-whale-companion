# dsh-whale-companion

[English](README.md) | 中文

这是一个本地优先的 DSH 鲸鱼伙伴：把不含内容的会话活动元数据转换为可拖动鲸鱼、等级、连续使用天数、统计、12 个成就和 6 套皮肤。

## 功能

- `shell.overlay` 鲸鱼支持拖动、方向键移动（Shift 加速）、左右边缘吸附、视口限制、归一化位置持久化和每 5 秒刷新。
- Settings → **鲸鱼小屋** 提供中文等级进度、统计、12 个锁定/解锁成就、6 款皮肤色板、明确的忙碌/错误提示、导出、严格导入和重置。
- 使用 `storageDomain` 持久化，所有变更串行执行，并限制幂等检查点数量。
- 皮肤包括 `ocean`、`coral`、`midnight`、`aurora`、`sunset` 和 `nebula`。
- 只使用 DSH 语义主题 token、本地打包资源，并支持减少动画设置。

每个用户回合获得 10 XP，工具结果获得 5 XP，会话开始获得 20 XP。只有 `user/message` 计为用户回合；等级由 XP 推导，连续天数按 UTC 会话开始日期计算；**早潮出发** 成就在 UTC 06:00 前活动时获得，而非取决于每月日期。

## 隐私

Host 只读取会话 id、事件序号、事件类型和时间戳。它绝不读取、保存、导出或展示提示词、助手输出、代码、路径、工具参数或工具结果。导出备份只包含通过校验的 `whale/v1` 进度数据。

## 安装

```powershell
npm pack . --pack-destination ../../dist
dsh plugin --profile web add ../../dist/dsh-whale-companion-1.0.0.tgz
```

安装后重启原有 DSH Web 进程并刷新页面。环境要求和验收步骤见[套件安装指南](../../INSTALL.zh-CN.md)。

## 模型体验

本插件不会增加模型提示、工具、消息、token 消耗或 KV cache 内容；只在 Host 观察已提交的会话事件元数据，并提供浏览器界面。

## 已知限制

进度只保存在一个 DSH 本地存储后端，不会跨设备同步。覆盖层通过每 5 秒轮询刷新，而不是订阅专用进度事件。

## 开发

在工作区根目录运行 `corepack pnpm typecheck`、`corepack pnpm test`、`corepack pnpm build` 和 `corepack pnpm pack:check`。

MIT，见 [LICENSE](LICENSE)。
