# dsh-whale-companion

[English](README.md) | 中文

这是一个本地优先的 DSH 鲸鱼世界：把安全的会话活动元数据变成可拖动的鲸鱼伙伴、20 种可解锁鲸灵、潮汐记录、个人海湾、温柔远征和主动加入的本地鲸群卡片。

2.5.0 适配 DSH 0.1.2-rc.1 的新界面服务，保留伙伴名字、外观、位置、成长记录、纪念物、小屋方案和已有图鉴。后台成长记录写入失败时，会话仍可继续，后续事件仍可保存；失败的那次成长记录可能遗漏。手动保存失败仍会反馈给用户。会话要求保存和插件关闭时，会等待此前已接受的写入结束；日志只记录固定提示，不记录会话标识、内容或底层错误。

小须鲸换成了新的墨色游动美术：24 个 ImageGen 实绘姿态，按一次上摆、下摆排列，加入 72 张光栅补帧，以 96 帧、1.6 秒、60 fps 循环播放。头眼位置稳定，躯干、胸鳍和尾部都参与运动；系统或插件要求减少动态效果时改用同源 PNG。没有使用 SVG，也没有把一张静图摆尾冒充 24 张绘图。完整提示词与来源见 [生图记录](docs/imagegen-20260905-prompts.md)。

![新墨鲸在240、144和100像素宽度下的播放预览](docs/ink-whale-motion-60fps.gif)

GIF用于兼容预览；其时间精度受格式和浏览器限制。准确速度以插件内播放或[原生 WebP 动画](packages/dsh-whale-companion/assets/ink-whale-motion.webp)为准。

## 界面截图

| 鲸鱼小屋 | 鲸灵图鉴 |
| --- | --- |
| ![Whale Companion 概览](assets/screenshots/overview.png) | ![Whale Companion 鲸灵图鉴](assets/screenshots/atlas.png) |

![Whale Companion 皮肤、成就与本地备份](assets/screenshots/customize.png)

> 在本地运行的 DSH Web 会话中未经编辑截取；进度数据来自该会话，实际外观会随 DSH 主题和视口变化。

## 功能

- **2.4.0 完整交付**：可命名伙伴、四类动态航行任务、ImageGen 栅格鲸鱼肖像、栅格精灵小须鲸动画、快速航行卡、XP 即时反馈、六套配色、本地 PNG 航行名片和文本战报；运行时不再绘制矢量鲸鱼。
- Session 日期现在优先使用真实创建时间；历史迟到事件不会回滚连续天数；所有文本导入在 JSON 解析前执行 512 KiB 上限检查，持久化提交前重新通过完整 Schema 校验。
- CI 新增实际客户端 Bundle 的浏览器挂载烟雾测试，以及桌面、移动端、浅色和减少动画模式的 Playwright 截图回归。
- `shell.overlay` 鲸鱼支持指针拖动、方向键移动、边缘吸附、视口安全位置持久化，以及共享的每 5 秒本地刷新。新潮汐会显示为有时限的可见气泡，只有里程碑会打扰读屏。
- 安静、标准、热闹三档陪伴强度只保存在浏览器本地；系统减少动画设置始终优先，偏好存储被拒绝也不会影响进度。
- 鲸鱼小屋首页新增七日航海日志、当前鲸灵故事、可视海湾预览和与真实出口一致的隐私账本。
- 小须鲸在浮动伙伴、小屋与快速卡中使用同一套墨色光栅动画；24 个实绘原始姿态和 72 个补帧明确区分，背景保持静止，减少动态效果使用匹配静帧。
- 20 种鲸灵随海洋等级 1–100 解锁。它们把故事与可见潮汐反应映射到安全事件家族，不会改变模型执行结果。
- 只使用 live-only 的 `session/created`、`user/message` 和 `tool/result` 元数据产生有上限的本地潮汐。重复工具结果仍保留旧版 XP 统计，但不能刷潮汐、纪念物或远征进度。
- 鲸鱼小屋包含潮汐时间线、本地 PNG 明信片、24 件纪念物、8 个固定房间插槽、3 个小屋方案，以及无惩罚远征。
- 访客瓶是隔离的只读小屋预览，不会合并或覆盖接收者的进度。
- 鲸群卡片需要主动开启，只通过本地文件交换预设别名、鲸灵、皮肤、粗粒度活跃桶和共鸣星级。没有帐号、联网、排行、自由文本、提示词摘录、任务名或工具数据。
- 提供 6 套海域皮肤、12 个成就、响应式布局、键盘操作、焦点管理和减少动画呈现。

用户回合获得 10 XP，工具结果获得 5 XP，会话开始获得 20 XP。只有 `user/message` 计为用户回合；等级由 XP 推导，连续使用按 UTC 会话开始日期计算。缺席不会丢失进度或纪念物。

## 隐私

Host 只读取会话 id、事件序号、事件类型和时间戳。它绝不读取、保存、导出或展示提示词、助手输出、代码、路径、工具参数或工具结果。

新的内存收据摘要使用只在 Host 进程内存在的 HMAC 密钥。持久收据最多保留 4,096 条，用于防止最近的 live 重复投递，而不是承诺跨 Host 重启的永久去重。备份刻意不包含收据摘要、会话 id 或事件数据。PNG 明信片和鲸群卡片都在本地生成，且只包含此文档列出的安全字段。

## 安装

直接从 GitHub 安装到 DSH Web profile：

```powershell
dsh plugin --profile web add github:LeemanCheung/dsh-whale-companion
```

重启原有 DSH Web 进程并刷新页面。

## 模型体验

本插件不会增加模型提示、工具、消息、token 消耗或 KV cache 内容；只在 Host 观察已提交的会话事件元数据，并提供浏览器界面。

## 已知限制

进度只保存在一个 DSH 存储后端，不会跨设备同步。因为当前 Host Remote 事件白名单没有包级鲸鱼状态推送路由，覆盖层每 5 秒轮询一次。鲸群卡片刻意只支持本地导入导出；托管社区需要独立负责认证、删除、限流和审核的传输服务。

## 开发

在仓库根目录运行：

```powershell
python -m pip install -r requirements-art.txt
corepack pnpm typecheck
corepack pnpm verify:minke:rebuild
corepack pnpm verify:minke
corepack pnpm verify:species:rebuild
corepack pnpm test
corepack pnpm build
corepack pnpm pack:check
```

美术流水线固定使用 Python 3.12、NumPy 2.3.3 和 Pillow 12.3.0。`corepack pnpm art:minke` 重建透明游泳精灵；`corepack pnpm art:species` 规范化仓库内的 ImageGen 20 鲸种图鉴。生产客户端内嵌两类栅格资产，不再包含运行时矢量鲸鱼绘制。

视觉截图基线只由 Ubuntu CI 维护。其他平台仍执行交互、动态、减少动画和窄屏布局断言，但不会生成用于候选发布的截图基线。

MIT，见 [LICENSE](LICENSE)。
