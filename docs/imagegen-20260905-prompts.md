# 2026-09-05 鲸鱼动作源图

生成方式：Codex 内置 ImageGen。未使用 SVG 画鲸鱼。下列两次原始输出和完整提示词保留用于复查。24 个动作格是模型分别绘制的原始姿态，裁切、去白底、对齐与播放检查由离线构建完成；不能将同一静态图平移或只摆尾当作24个实绘动作。

用户造型参考：`codex-clipboard-02472a8f-06e1-4a29-a47a-6566c5ea12f2.png`，黑白圆头跃鲸、有细长尾柄及两瓣尾鳍。参考是造型与风格，不是直接复制商标。

## 母图

原始输出 ID：`exec-1c3650f7-e2cc-44e3-b857-42585604a36d.png`。

```text
Use case: stylized-concept. Create a production raster character asset for a tiny animated whale companion in a software UI. The attached image is the user's accepted STYLE AND CHARACTER REFERENCE, not a layout to reproduce. Keep the same unmistakable elegant black ink whale: broad rounded blunt head, tiny restrained white eye, a delicate white mouth crease, continuous tapered flexible torso, two short pectoral fins, a beautifully long slender curved tail stock with two broad pointed flowing flukes. Original drawing inspired by the reference, no brand text or exact logo tracing. One whole whale only, in a neutral horizontal swimming pose facing right, with its long tail trailing left in a soft S curve; mouth and head calm and intelligent. The silhouette must be elegant and whale-like with a large rounded head and smooth back, NOT a generic oval fish, not a dolphin, no dorsal shark fin, no blue cartoon, no glossy 3D, no childish smile, no giant eyes. Render high-resolution pure black hand-ink silhouette with clean antialiased contour and just the tiny white eye/mouth negative detail. Transparent background with genuine alpha, no waterline, no splashes, no ring, no scene, no checkerboard pattern, no cast shadow, no text. Show full body and complete tail with generous transparent padding, consistent side view, naturally connected anatomy. Designed to retain identity at 60-84 pixels while its torso and tail will be animated separately. Landscape composition approximately 3:2. The whale should occupy 80 percent of the width, with head right and tail left, natural balanced proportions. Provide one polished final character only.
```

母图用于身份参考；其棋盘背景不能直接当作透明运行时资产。

原件保存在 `artwork-sources/ink-whale-identity-imagegen.png`，SHA256 `2efc6218ec3b23a9e383c6e6b813ce78765942fc2cbc20b27ff25d540b677414`。24姿态原件保存在 `artwork-sources/ink-whale-poses-imagegen.png`，SHA256 `a6993c0f3dfb158c3ad8fde200af0e3852f3620718467ffc02be8e0b0a9b802f`。

正式播放文件为 `packages/dsh-whale-companion/assets/ink-whale-motion.webp`，SHA256 `5a69d16f15c2f84ac027c19b3a9c186cd72ae6a1329efc66d8443d90adbea109`：24原始姿态按一次完整上下摆动排列，加72光流及轮廓补帧，共96帧、1.6秒。全部24原始姿态在编码后保留可见像素。生成24个源姿态与确定性补帧是两个不同步骤，没有把补帧称为新增生图。

裁切与眼部对齐记录见 `ink-whale-motion-report.json`；正式播放的帧顺序、来源、透明边界和像素复现报告见 `ink-whale-playback-report.json`（两者位于包内assets目录）。实际尺寸、首尾与主要过渡检查见 [视觉验收](ink-whale-visual-review.json) 和 [关键过渡表](ink-whale-transition-contact-sheet.png)。

## 24 个动作姿态

以母图为参考输入。原始输出 ID：`exec-090c428f-2c29-463e-bbd2-c7076e7cfc32.png`。

```text
Use case: identity-preserve. Asset: production animation sprite source, exactly 24 individually drawn poses of the SAME whale character in the reference, on ONE sheet laid out as exactly SIX COLUMNS by FOUR ROWS (6x4), each equal cell. The attached black ink whale is the exact identity reference. Draw a complete smooth one-cycle horizontal swimming animation, reading left-to-right then top-to-bottom across all 24 cells. Every whale faces right. Hold the blunt rounded head and eye at nearly the same location and size in each cell. Make the TORSO visibly flex and bend in a traveling smooth S wave that moves toward the long tailstock and both tail flukes; the pectoral fins make a tiny corresponding paddle. It must not be just a rigid static torso with only a rotating tail. Poses 1-6 gradually arch torso and raise tail, poses 7-12 settle through neutral then lower tail with opposite torso curvature, poses13-18 reverse curvature and raise the tail again gently, poses19-24 complete the cycle toward the first pose. Smooth small changes every frame, no sudden anatomy changes. All 24 whales use identical scale, placement, camera, clean hand-ink edge, one tiny white eye and fine mouth crease; long elegant tail, no generic fish, no extra fins, no eyes changing size, no giant smile. A pure solid WHITE #ffffff background for easy deterministic cutout, absolutely NO checkerboard grid texture or gray squares. No grid lines, labels, numbers, shadows, bubbles, waterline or other objects. Keep each whole whale and complete tail inside its own cell with 10% white gutter. High-resolution 3:2 landscape sheet ideally 3072x2048 pixels. Draw all 24 poses separately rather than duplicate a single shape. Need polished black and white minimal character animation artwork, NOT blue cartoon, NOT SVG.
```

输出实际尺寸以文件解析结果为准，不能把提示词请求的尺寸当成实际尺寸。最终接触表、播放结果和文件哈希由构建审计记录提供。
