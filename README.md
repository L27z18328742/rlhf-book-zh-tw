# RLHF 中文版 — 从人类反馈中强化学习（互动版）

> **非官方社群翻译（Unofficial Community Translation）**
> 本项目为 Nathan Lambert《[Reinforcement Learning from Human Feedback](https://rlhfbook.com)》（2026-07-01 版）的简体中文（zh-CN）全译本，由台湾 [Twinkle AI Community](https://github.com/ai-twinkle) 翻译维护，已获原作者知悉（[rlhf-book#472](https://github.com/natolambert/rlhf-book/issues/472)）。依 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 授权，仅供学习研究、不得作商业用途。支持原作者请购买[实体书](https://rlhfbook.com)。

**📖 在线阅读：<https://apps.twinkleai.tw/rlhf-book-zh-tw/>**

除了全书翻译，每一章都配备一个**互动实验**，让读者能动手操作该章的核心概念——从 Bradley-Terry 偏好概率、PPO 裁剪目标、GRPO 群组优势，到 DPO 损失曲面与前向／反向 KL 的收敛行为。

## 互动实验一览

| 章节 | 实验 |
|---|---|
| 第 1 章 导论 | RLHF 三步骤互动管线 |
| 第 2 章 RLHF 简史 | RLHF 发展互动时间轴 |
| 第 3 章 训练总览 | 温控器 RL 模拟器 |
| 第 4 章 指令微调 | 聊天模板建构器（ChatML／Zephyr／Tülu＋损失遮罩） |
| 第 5 章 奖励模型 | Bradley-Terry 奖励模型探索器 |
| 第 6 章 强化学习 | PPO 裁剪目标／GRPO 群组优势游乐场 |
| 第 7 章 推理与推论时扩展 | pass@k vs 多数决模拟 |
| 第 8 章 直接对齐算法 | DPO 损失探索器 |
| 第 9 章 拒绝采样 | 拒绝采样与 Best-of-N 模拟器 |
| 第 10 章 偏好的本质 | 偏好聚合悖论（Condorcet 循环） |
| 第 11 章 偏好数据 | 当一次偏好标注员（偏误陷阱体验） |
| 第 12 章 合成数据与蒸馏 | 知识蒸馏软标签实验室 |
| 第 13 章 工具使用 | 工具调用流程模拟器 |
| 第 14 章 过度优化 | 奖励过度优化模拟（Goodhart 定律） |
| 第 15 章 正则化 | KL 散度探索器（前向 vs 反向） |
| 第 16 章 评估 | 评估噪声模拟器 |
| 第 17 章 模型性格 | Persona 向量调音台 |
| 附录 A／B／C | 词汇抽认卡／话多平衡体验器／评测变异查核器 |

## 目录结构

```
├── content/                     # 逐章翻译的独立 Markdown（17 章 + 3 附录 + 参考文献）
├── webapp/                      # 交互式网站（纯静态、完全离线可用）
│   ├── index.html               # 目录首页
│   ├── chapters/*.html          # 每章一页（内嵌翻译内容）
│   └── assets/                  # 样式、渲染器、互动组件、插图、本地函数库
└── build.py                     # 构建脚本：content/*.md → webapp 页面
```

## 本地使用

```bash
cd webapp && python3 -m http.server 8642 --bind 0.0.0.0   # 局域网设备通过本机 IP 访问
```

修改 `content/*.md` 或添加 `webapp/assets/widgets/*.js` 后重新执行 `python3 build.py`。

## 翻译惯例

- 专有名词第一次出现采「中文（English）」，常用缩写（RLHF、PPO、DPO、SFT…）保留英文
- 数学式以 LaTeX 转录，公式编号沿用原书（`\tag{n}`）
- 文献引用标记 [N] 对应 `content/bibliography.md`（保留原文）
- 代码区块保留原文，注解翻译

发现翻译问题欢迎开 issue 或 PR。

---

## About (English)

This is an **unofficial Simplified Chinese (zh-CN) community translation** of *[Reinforcement Learning from Human Feedback](https://rlhfbook.com)* by Nathan Lambert (2026-07-01 edition), maintained by the [Twinkle AI Community](https://github.com/ai-twinkle) in Taiwan, acknowledged by the author in [rlhf-book#472](https://github.com/natolambert/rlhf-book/issues/472).

Beyond the full translation, every chapter ships with an **interactive lab** — a hands-on demo of the chapter's core concept (Bradley-Terry explorer, PPO clipping / GRPO group-advantage playground, DPO loss explorer, forward/reverse KL visualizer, and more).

**Read online: <https://apps.twinkleai.tw/rlhf-book-zh-tw/>**

Licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), same as the original chapters. Non-commercial; full attribution to the original author. Please support the author by purchasing the [print edition](https://rlhfbook.com).

## Citation

Please cite the original book:

```bibtex
@book{rlhf2026lambert,
  author       = {Nathan Lambert},
  title        = {Reinforcement Learning from Human Feedback},
  year         = {2026},
  publisher    = {Online},
  url          = {https://rlhfbook.com},
}
```
