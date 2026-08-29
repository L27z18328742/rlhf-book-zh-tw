#!/usr/bin/env python3
"""RLHF 中文版构建脚本：
1. 合并 content/ch06a.md + ch06b.md → ch06.md
2. 从 PDF 抽出参考文献 → content/bibliography.md（已存在则略过）
3. 将 content/*.md 包装成 webapp/chapters/*.html
4. 产生 webapp/index.html 目录页
重新执行即可整站重建。
"""
import html
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, "content")
WEBAPP = os.path.join(ROOT, "webapp")
CHAPDIR = os.path.join(WEBAPP, "chapters")
PDF = os.path.join(ROOT, "RL_from_human_feedback.pdf")

CHAPTERS = [
    dict(id="ch01", no="第 1 章", zh="导论", en="Introduction",
         desc="RLHF 是什么、为何诞生、三步骤流程与后训练的整体直觉。"),
    dict(id="ch02", no="第 2 章", zh="RLHF 简史", en="A Tiny History of RLHF",
         desc="从偏好式 RL 的起源、语言模型时代，到 ChatGPT 之后的爆发。"),
    dict(id="ch03", no="第 3 章", zh="训练总览", en="Training Overview",
         desc="问题形式化、RL 设定的调整，与 InstructGPT／Tülu 3／DeepSeek R1 的经典配方。"),
    dict(id="ch04", no="第 4 章", zh="指令微调", en="Instruction Fine-Tuning",
         desc="聊天模板、指令数据的最佳实践与实现细节。"),
    dict(id="ch05", no="第 5 章", zh="奖励模型", en="Reward Modeling",
         desc="Bradley-Terry 模型、架构与实现、ORM／PRM 与 LLM-as-a-judge。"),
    dict(id="ch06", no="第 6 章", zh="强化学习", en="Reinforcement Learning",
         desc="策略梯度推导、REINFORCE／PPO／GRPO 全家族与实现要点。"),
    dict(id="ch07", no="第 7 章", zh="推理与推论时扩展", en="Reasoning & Inference-Time Scaling",
         desc="RLVR 的角色、推理模型的起源与训练惯例。"),
    dict(id="ch08", no="第 8 章", zh="直接对齐算法", en="Direct-Alignment Algorithms",
         desc="DPO 的原理与完整推导、数值疑虑与在线／离线之辨。"),
    dict(id="ch09", no="第 9 章", zh="拒绝采样", en="Rejection Sampling",
         desc="生成、评分、微调的逐步流程与 Best-of-N 采样。"),
    dict(id="ch10", no="第 10 章", zh="偏好的本质", en="The Nature of Preferences",
         desc="从经济学、哲学到最优控制：偏好与效用的跨领域根源。"),
    dict(id="ch11", no="第 11 章", zh="偏好数据", en="Preference Data",
         desc="标注接口、排序与评分、数据源与偏误陷阱。"),
    dict(id="ch12", no="第 12 章", zh="合成数据与蒸馏", en="Synthetic Data & Distillation",
         desc="蒸馏、on-policy 师生训练、AI 反馈与宪法式 AI。"),
    dict(id="ch13", no="第 13 章", zh="工具使用与函数调用", en="Tool Use & Function Calling",
         desc="工具调用的生成交织、多步骤推理与 MCP。"),
    dict(id="ch14", no="第 14 章", zh="过度优化", en="Over-Optimization",
         desc="Goodhart 定律、代理目标的质性与量化失控。"),
    dict(id="ch15", no="第 15 章", zh="正则化", en="Regularization",
         desc="KL 惩罚、隐性正则化，与「SFT 记忆、RL 泛化」。"),
    dict(id="ch16", no="第 16 章", zh="评估", en="Evaluation",
         desc="提示格式、外部评比为何不可靠、污染与工具链。"),
    dict(id="ch17", no="第 17 章", zh="打造模型性格与产品", en="Model Character & Products",
         desc="性格训练、persona 向量、模型规格与产品周期。"),
    dict(id="appa", no="附录 A", zh="定义", en="Definitions",
         desc="全书使用的符号、定义与延伸词汇表。"),
    dict(id="appb", no="附录 B", zh="不只是「风格」", en='Beyond "Just Style"',
         desc="为何风格是沟通的载体，以及话多的平衡。"),
    dict(id="appc", no="附录 C", zh="实践议题", en="Practical Issues",
         desc="后训练的计算成本、评估变异与异常任务辨识。"),
    dict(id="bibliography", no="参考文献", zh="参考文献", en="Bibliography",
         desc="全书引用文献（保留原文）。"),
]

PAGE_TMPL = """<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — RLHF 中文版</title>
<link rel="stylesheet" href="../assets/katex/katex.min.css">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="topbar">
  <a class="brand" href="../index.html">RLHF 中文版<span>从人类反馈中强化学习</span></a>
  <nav class="chapnav">{prev_top}<span class="chapnav-current">{no}</span>{next_top}<a class="gh-star" href="https://github.com/ai-twinkle/rlhf-book-zh-tw" target="_blank" rel="noopener" data-gh-repo="ai-twinkle/rlhf-book-zh-tw"><span class="star-ico">★</span><span class="gh-label">Star</span><b class="gh-count" hidden></b></a></nav>
</header>
<div class="layout">
  <aside class="sidebar"><nav id="toc" class="toc"><h2>本章目录</h2></nav></aside>
  <main class="main">
    <div id="lab-banner"></div>
    <article id="content" class="prose"></article>
    <section id="lab" class="lab" hidden>
      <h2 class="lab-title">🧪 互动实验室</h2>
      <div id="lab-intro"></div>
      <div id="lab-root"></div>
    </section>
    <nav class="pager">{prev_card}{next_card}</nav>
    <footer class="pagefoot">本站为 <a href="https://github.com/ai-twinkle">Twinkle AI Community</a>（台湾）的<strong>非官方社群翻译</strong>（unofficial community translation）· 译自 Nathan Lambert,《Reinforcement Learning from Human Feedback》（<a href="https://rlhfbook.com">rlhfbook.com</a>）· 依 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans">CC BY-NC-SA 4.0</a> 授权，仅供学习研究、不得作商业用途。</footer>
  </main>
</div>
<script type="text/markdown" id="chapter-md">
{md}
</script>
<script src="../assets/marked.min.js"></script>
<script src="../assets/katex/katex.min.js"></script>
<script src="../assets/katex/auto-render.min.js"></script>
{widget_tag}<script src="../assets/app.js"></script>
<script src="../assets/gh-star.js"></script>
</body>
</html>
"""

INDEX_TMPL = """<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RLHF 中文版 — 从人类反馈中强化学习</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<section class="hero">
  <div class="eyebrow">简体中文全译本 · 互动版</div>
  <h1>从人类反馈中强化学习<br>Reinforcement Learning from Human Feedback</h1>
  <p class="sub">Nathan Lambert 著。一本聚焦语言模型的 RLHF 与后训练（post-training）简明导论：从指令微调、奖励模型，到 PPO／GRPO、DPO、拒绝采样与推理模型。每一章都附有互动实验，边玩边懂核心概念。</p>
  <p class="sub" style="font-size:.82rem">由台湾 <a href="https://github.com/ai-twinkle">Twinkle AI Community</a> 翻译维护的非官方社群翻译版本。</p>
  <div class="meta">
    <div><b>{n_ch}</b>章节</div>
    <div><b>{n_app}</b>附录</div>
    <div><b>{n_fig}</b>插图</div>
    <div><b>{n_lab}</b>互动实验</div>
    <a href="https://github.com/ai-twinkle/rlhf-book-zh-tw" target="_blank" rel="noopener" data-gh-repo="ai-twinkle/rlhf-book-zh-tw"><b class="gh-count">—</b>GitHub ★</a>
  </div>
</section>
<div class="grid-wrap">
  <h2>章节</h2>
  <div class="chapter-grid">
{chapter_cards}
  </div>
  <h2>附录与文献</h2>
  <div class="chapter-grid">
{appendix_cards}
  </div>
</div>
<footer class="foot">本站为 <a href="https://github.com/ai-twinkle">Twinkle AI Community</a>（台湾）的<strong>非官方社群翻译</strong>（unofficial community translation），已获原作者知悉（<a href="https://github.com/natolambert/rlhf-book/issues/472">rlhf-book#472</a>）· 译自 Nathan Lambert,《Reinforcement Learning from Human Feedback》（<a href="https://rlhfbook.com">rlhfbook.com</a>，2026-07-01 版）· 依 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans">CC BY-NC-SA 4.0</a> 授权翻译，仅供学习研究、不得作商业用途 · 支持原作者请购买<a href="https://rlhfbook.com">实体书</a> · <a href="https://github.com/ai-twinkle/rlhf-book-zh-tw">GitHub 源代码</a></footer>
<script src="assets/gh-star.js"></script>
</body>
</html>
"""


def merge_ch06():
    a, b = os.path.join(CONTENT, "ch06a.md"), os.path.join(CONTENT, "ch06b.md")
    if os.path.exists(a) and os.path.exists(b):
        with open(a) as f1, open(b) as f2:
            merged = f1.read().rstrip() + "\n\n" + f2.read().lstrip()
        with open(os.path.join(CONTENT, "ch06.md"), "w") as f:
            f.write(merged)
        print("merged ch06a + ch06b -> ch06.md")


def extract_bibliography():
    out = os.path.join(CONTENT, "bibliography.md")
    if os.path.exists(out):
        return
    txt = subprocess.run(
        ["pdftotext", "-raw", "-f", "205", "-l", "226", PDF, "-"],
        capture_output=True, text=True).stdout
    # 去页脚、修复跨行断字与断行 URL，重组每一条文献
    txt = re.sub(r"rlhfbook\.com\s*\n?\d+\s*\n", "", txt)
    txt = txt.replace("Bibliography\n", "")
    entries = re.split(r"\n(?=\[\d+\]\s)", txt.strip())
    lines = ["# 参考文献（Bibliography）", "",
             "> 依原书保留原文，不另翻译。编号对应各章引用标记 [N]。", ""]
    for e in entries:
        e = e.strip()
        if not e:
            continue
        e = re.sub(r"-\n(?=[a-z])", "", e)   # 断字
        e = re.sub(r"\n", " ", e)            # 其余换行并成一行
        e = re.sub(r"(https?://\S+?)\s+(?=\S)", lambda m: m.group(1), e)  # 断行网址
        m = re.match(r"\[(\d+)\]\s*(.*)", e)
        if m:
            lines.append(f"{m.group(1)}. {m.group(2)}")
        else:
            lines.append(e)
    with open(out, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"extracted bibliography ({len(entries)} entries)")


def build_pages():
    os.makedirs(CHAPDIR, exist_ok=True)
    built = {}
    for ch in CHAPTERS:
        src = os.path.join(CONTENT, ch["id"] + ".md")
        built[ch["id"]] = os.path.exists(src)
    n_built = 0
    for i, ch in enumerate(CHAPTERS):
        src = os.path.join(CONTENT, ch["id"] + ".md")
        if not built[ch["id"]]:
            continue
        with open(src) as f:
            md = f.read().replace("</script", "<\\/script")
        prev = next((c for c in reversed(CHAPTERS[:i]) if built[c["id"]]), None)
        nxt = next((c for c in CHAPTERS[i + 1:] if built[c["id"]]), None)
        prev_top = f'<a href="{prev["id"]}.html">← {prev["no"]}</a>' if prev else ""
        next_top = f'<a href="{nxt["id"]}.html">{nxt["no"]} →</a>' if nxt else ""
        prev_card = (f'<a class="prev" href="{prev["id"]}.html"><span class="dir">← 上一章</span>'
                     f'<div class="ttl">{prev["no"]}　{prev["zh"]}</div></a>') if prev else "<span></span>"
        next_card = (f'<a class="next" href="{nxt["id"]}.html"><span class="dir">下一章 →</span>'
                     f'<div class="ttl">{nxt["no"]}　{nxt["zh"]}</div></a>') if nxt else ""
        widget = os.path.join(WEBAPP, "assets", "widgets", ch["id"] + ".js")
        widget_tag = (f'<script src="../assets/widgets/{ch["id"]}.js"></script>\n'
                      if os.path.exists(widget) else "")
        page = PAGE_TMPL.format(
            title=f'{ch["no"]}　{ch["zh"]}', no=f'{ch["no"]}　{ch["zh"]}',
            prev_top=prev_top, next_top=next_top,
            prev_card=prev_card, next_card=next_card,
            md=md, widget_tag=widget_tag)
        with open(os.path.join(CHAPDIR, ch["id"] + ".html"), "w") as f:
            f.write(page)
        n_built += 1
    return built, n_built


def build_index(built):
    def card(ch):
        has_widget = os.path.exists(os.path.join(WEBAPP, "assets", "widgets", ch["id"] + ".js"))
        badge = '<span class="badge">互动实验</span>' if has_widget else ""
        inner = (f'{badge}<span class="no">{html.escape(ch["no"])}</span>'
                 f'<span class="zh">{html.escape(ch["zh"])}</span>'
                 f'<span class="en">{html.escape(ch["en"])}</span>'
                 f'<span class="desc">{html.escape(ch["desc"])}</span>')
        if built.get(ch["id"]):
            return f'    <a class="card" href="chapters/{ch["id"]}.html">{inner}</a>'
        return f'    <div class="card disabled">{inner}<span class="badge">翻译中</span></div>'

    ch_cards = "\n".join(card(c) for c in CHAPTERS if c["id"].startswith("ch"))
    app_cards = "\n".join(card(c) for c in CHAPTERS if not c["id"].startswith("ch"))
    figdir = os.path.join(WEBAPP, "assets", "figures")
    n_fig = len([f for f in os.listdir(figdir) if f.endswith(".png")]) if os.path.isdir(figdir) else 0
    widgets = os.path.join(WEBAPP, "assets", "widgets")
    n_lab = len([f for f in os.listdir(widgets) if f.endswith(".js")]) if os.path.isdir(widgets) else 0
    page = INDEX_TMPL.format(n_ch=17, n_app=3, n_fig=n_fig, n_lab=n_lab,
                             chapter_cards=ch_cards, appendix_cards=app_cards)
    with open(os.path.join(WEBAPP, "index.html"), "w") as f:
        f.write(page)


if __name__ == "__main__":
    merge_ch06()
    extract_bibliography()
    built, n = build_pages()
    build_index(built)
    missing = [k for k, v in built.items() if not v]
    print(f"built {n} chapter pages; missing: {', '.join(missing) if missing else 'none'}")
