(function () {
  'use strict';

  // 管线项目依序排列：偶数索引为节点（阶段），奇数索引为箭头（数据流）
  var ITEMS = [
    { kind: 'node', name: '基础模型', en: 'Base Model',
      what: '经过大规模自回归预训练（下一词元预测）的语言模型。它只会「补完文字」，还不会以问答格式回应用户。',
      input: '以网页为主的大规模预训练数据（数兆词元）', output: '蕴藏知识与潜力、但没有助理行为的基础模型',
      chapter: '第 1 章 1.4 节（后训练的直觉）、第 3 章（训练概观）',
      insight: '引出诠释：基础模型就像 F1 赛车的底盘，决定了最终模型绝大部分的潜力；后训练的工作是把潜力全部引出来。' },
    { kind: 'edge', name: '指令数据 ~10K',
      what: '喂入精心打造的问答格式范例。模型「只」看到问答格式的数据，因此从补完文字转为以助理人格回答查询。',
      input: '约 1 万笔（~10K）高质量指令—回应对', output: '训练信号：下一词元预测损失',
      chapter: '第 4 章（指令微调）、第 12 章（合成数据）',
      insight: '量级小但质量关键：几千到上万笔样本就能大幅改变模型的格式与人格，但这不代表「指令微调就足以实现对齐」。' },
    { kind: 'node', name: 'SFT 模型', en: 'SFT Model',
      what: '指令微调／监督式微调（IFT/SFT）：用同样的下一词元预测损失在问答数据上训练，教导模型格式，打下遵循指令能力的基础。',
      input: '指令数据，量级约 1 万笔（~10K）', output: '能以问答格式可靠回应的指令遵循模型',
      chapter: '第 4 章（指令微调）',
      insight: 'SFT 学的是语言中的「特征」：逐词元（per-token）更新。它也是 RLHF 需要的强大起点——没有好的 SFT，RLHF 难以奏效。' },
    { kind: 'edge', name: '偏好数据 ~100K',
      what: '标注者在同一提示词的多个模型补全之间表达偏好（如「A 比 B 好」），构成训练奖励模型的成对比较数据集。',
      input: '约 10 万笔（~100K）人类偏好比较', output: '训练信号：对比式（contrastive）损失',
      chapter: '第 10 章（偏好的本质）、第 11 章（偏好数据）',
      insight: '偏好数据远比指令数据昂贵——10 万至 100 万美元等级的数据预算，曾是开放社群做 RLHF 的最大门槛。' },
    { kind: 'node', name: '奖励模型', en: 'Reward Model',
      what: '通常以 SFT 模型为起点，在偏好数据上微调，学习「怎样的回答比较好」，能为任何一段文字输出好坏分数。',
      input: '偏好数据，量级约 10 万笔（~100K）', output: '作为人类偏好代理（proxy）的奖励模型',
      chapter: '第 5 章（奖励模型建构）',
      insight: '奖励模型充其量只是真实目标的代理，且数据噪声较多——这正是 RL 阶段容易「过度优化」、需要正则化的根源。' },
    { kind: 'edge', name: '奖励信号',
      what: '在 RL 期间，奖励模型为策略采样出的每个补全评分，把「人类觉得好不好」转换成 RL 优化器可以使用的数字。',
      input: '语言模型生成的补全结果（completions）', output: '标量（scalar）奖励分数',
      chapter: '第 5 章（奖励模型建构）、第 6 章（强化学习）',
      insight: '这个标量信号是整条管线的枢纽：它让「难以明确定义」的人类偏好，变成可以被优化的目标。' },
    { kind: 'node', name: 'RL 优化', en: 'RL Optimizer',
      what: '取一批提示词，让模型生成补全，由奖励模型评分，再用任选的 RL 优化器更新参数，让好的词元更可能出现。',
      input: '提示词集合＋奖励模型的标量信号', output: '朝人类偏好迭代更新的模型参数',
      chapter: '第 3 章（训练概观）、第 6 章（强化学习）',
      insight: '与 SFT 的逐词元更新不同，RLHF 在「整体回应」层级学习：告诉模型更好的回应长什么样、又该避免哪些回应。' },
    { kind: 'edge', name: '迭代更新',
      what: 'RL 优化器推导更新规则，把好坏归因到模型参数上，并以迭代方式进行，以维持初始模型的一般能力。',
      input: '梯度更新（搭配 KL 等正则化约束）', output: '性能饱和后的最终模型',
      chapter: '第 6 章（强化学习）、第 15 章（正则化）',
      insight: '一旦 RL 完成且性能达到饱和，这通常就是提供给用户的最终模型。' },
    { kind: 'node', name: '对齐模型', en: 'Aligned Model',
      what: 'RLHF 完成后的最终模型：以可靠、温暖且引人入胜的风格回答问题，同时做到有帮助（helpful）且无害（harmless）。',
      input: '—（整条管线的最终产物）', output: '对齐人类偏好的助理模型（如 ChatGPT、Tülu 3）',
      chapter: '第 14–16 章（过度优化、正则化、评估）',
      insight: 'RLHF 比指令微调更能跨领域泛化，是催生现代后训练的源头。往下用对照卡感受它前后的差异。' }
  ];

  var DEFAULT_SEL = 2; // 默认高亮 SFT 模型
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var W = 780, H = 96, NW = 112, NH = 46, NY = 32, GAP = 52, CY = NY + NH / 2;

  var COMPARE = {
    prompt: 'The president of the united states in 2006 was（2006 年的美国总统是）',
    base: { btn: '基础模型（Base）', model: 'Llama 3.1 405B Base（仅预训练）',
      text: 'George W. Bush（乔治·W·布希），2006 年的佛罗里达州州长是 Jeb Bush（杰布·布希），而 John McCain（约翰·马侃）在 2006 年是亚利桑那州参议员——他后来败给了 obama（欧巴马）。9 月 1 日——美国总统布希签署一项行政命令，让信仰型组织在提供由联邦资金支付的社会服务时拥有更多选项。1 月 1 日——目前由美国国会在《非法网络赌博执法法》（UIGEA）中设定的期限。search：1961 年《保护植物新品种国际公约》的修正案要求植物育种者权利纳入农民特权。2009 年是格里历中以星期四开始的平年……',
      note: '基础模型只是在「补完句子」，还混入常见的网络中继数据——内容语无伦次，因为它从未学过以问答格式回应。' },
    rlhf: { btn: 'RLHF 后（对齐）', model: 'Tülu 3 405B（完整后训练）',
      text: 'George W. Bush（乔治·W·布希）是 2006 年的美国总统。他在任两届，任期自 2001 年 1 月 20 日至 2009 年 1 月 20 日。',
      note: '对齐模型简洁、直接地回答同一个提示。这种风格上的转变，正是 RLHF 与其他后训练方法带来的结果。' }
  };

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function ensureStyle() {
    if (document.getElementById('ch01w-style')) return;
    var st = document.createElement('style');
    st.id = 'ch01w-style';
    st.textContent = '@keyframes ch01w-dash{to{stroke-dashoffset:-14;}}' +
      '.ch01w-flow{stroke-dasharray:7 7;animation:ch01w-dash .55s linear infinite;}';
    document.head.appendChild(st);
  }

  function render(rootEl) {
    ensureStyle();
    var state = { sel: DEFAULT_SEL, playing: false, timer: null, compare: 'base' };

    // --- 播放控制列 ---
    var ctrlRow = document.createElement('div');
    ctrlRow.className = 'widget-row';
    ctrlRow.style.cssText = 'margin-bottom:.6rem;align-items:center;gap:.75rem;';
    var playBtn = document.createElement('button');
    playBtn.textContent = '播放整条管线';
    var hint = document.createElement('span');
    hint.style.cssText = 'color:var(--fg-muted);font-size:.85rem;';
    hint.textContent = '或直接点击图中的节点与箭头';
    ctrlRow.appendChild(playBtn); ctrlRow.appendChild(hint);

    // --- SVG 流程图（呼应书中图 1）---
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'overflow-x:auto;padding-bottom:.25rem;';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'RLHF 三步骤管线流程图' });
    svg.style.cssText = 'display:block;width:100%;min-width:640px;height:auto;';
    svgWrap.appendChild(svg);

    var refs = ITEMS.map(function (item, i) {
      var g = svgEl('g', {});
      g.style.cursor = 'pointer';
      var r = {};
      if (item.kind === 'node') {
        var nx = 6 + (i / 2) * (NW + GAP);
        r.rect = svgEl('rect', { x: nx, y: NY, width: NW, height: NH, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--border)', 'stroke-width': '1.5' });
        var t1 = svgEl('text', { x: nx + NW / 2, y: NY + 20, 'text-anchor': 'middle', 'font-size': '12.5', 'font-weight': '700', fill: 'var(--fg)' });
        t1.textContent = item.name;
        var t2 = svgEl('text', { x: nx + NW / 2, y: NY + 36, 'text-anchor': 'middle', 'font-size': '9', fill: 'var(--fg-muted)' });
        t2.textContent = item.en;
        g.appendChild(r.rect); g.appendChild(t1); g.appendChild(t2);
      } else {
        var x0 = 6 + ((i - 1) / 2) * (NW + GAP) + NW, x1 = x0 + GAP, mid = (x0 + x1) / 2;
        r.line = svgEl('line', { x1: x0 + 3, y1: CY, x2: x1 - 10, y2: CY, stroke: 'var(--fg-muted)', 'stroke-width': '2' });
        r.head = svgEl('polygon', { points: (x1 - 10) + ',' + (CY - 4.5) + ' ' + (x1 - 1) + ',' + CY + ' ' + (x1 - 10) + ',' + (CY + 4.5), fill: 'var(--fg-muted)' });
        r.label = svgEl('text', { x: mid, y: 23, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--fg-muted)' });
        r.label.textContent = item.name;
        var hit = svgEl('rect', { x: x0, y: 12, width: GAP, height: NH + 28, fill: 'transparent' });
        g.appendChild(r.line); g.appendChild(r.head); g.appendChild(r.label); g.appendChild(hit);
      }
      var tip = svgEl('title', {});
      tip.textContent = item.name;
      g.appendChild(tip);
      g.addEventListener('click', function () { stopPlay(); state.sel = i; update(); });
      svg.appendChild(g);
      return r;
    });

    // --- 详情卡 ---
    var card = document.createElement('div');
    card.className = 'widget-panel';
    var badge = document.createElement('span');
    badge.style.cssText = 'display:inline-block;padding:.1em .7em;border-radius:999px;font-size:.75rem;border:1px solid;margin-bottom:.45rem;';
    var heading = document.createElement('div');
    heading.style.cssText = 'font-weight:700;font-size:1.05rem;color:var(--fg);margin-bottom:.35rem;';
    var what = document.createElement('p');
    what.style.cssText = 'margin:0 0 .55rem;line-height:1.75;color:var(--fg);';
    var fields = document.createElement('div');
    fields.style.cssText = 'font-size:.9rem;line-height:1.9;color:var(--fg);';
    var fieldEls = ['输入与量级', '产物', '对应章节'].map(function (lbl) {
      var row = document.createElement('div');
      var tag = document.createElement('span');
      tag.textContent = lbl;
      tag.style.cssText = 'display:inline-block;min-width:5.5em;color:var(--fg-muted);';
      var val = document.createElement('span');
      row.appendChild(tag); row.appendChild(val); fields.appendChild(row);
      return val;
    });
    var insight = document.createElement('p'); // 动态解读
    insight.style.cssText = 'margin:.65rem 0 0;padding:.5em .8em;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 8px 8px 0;font-size:.9rem;line-height:1.7;color:var(--fg);';
    card.appendChild(badge); card.appendChild(heading); card.appendChild(what); card.appendChild(fields); card.appendChild(insight);

    // --- Base vs RLHF 后 对照卡 ---
    var cmp = document.createElement('div');
    cmp.className = 'widget-panel';
    cmp.style.marginTop = '.75rem';
    var cmpTitle = document.createElement('div');
    cmpTitle.style.cssText = 'font-weight:700;color:var(--fg);margin-bottom:.5rem;';
    cmpTitle.textContent = 'RLHF 做了什么？同一提示的两种回答';
    var promptBox = document.createElement('div');
    promptBox.style.cssText = 'background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.5em .8em;font-size:.85rem;color:var(--fg);margin-bottom:.6rem;';
    promptBox.textContent = '提示词：' + COMPARE.prompt;
    var cmpRow = document.createElement('div');
    cmpRow.className = 'widget-row';
    cmpRow.style.cssText = 'gap:.5rem;margin-bottom:.6rem;';
    var cmpBtns = {};
    ['base', 'rlhf'].forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = COMPARE[k].btn;
      b.addEventListener('click', function () { state.compare = k; update(); });
      cmpBtns[k] = b; cmpRow.appendChild(b);
    });
    var modelTag = document.createElement('div');
    modelTag.style.cssText = 'font-size:.8rem;color:var(--fg-muted);margin-bottom:.35rem;';
    var output = document.createElement('div');
    output.style.cssText = 'background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:.7em .9em;font-size:.88rem;line-height:1.8;color:var(--fg);min-height:6.5em;';
    var cmpNote = document.createElement('p');
    cmpNote.style.cssText = 'margin:.55rem 0 0;font-size:.85rem;color:var(--fg-muted);line-height:1.7;';
    cmp.appendChild(cmpTitle); cmp.appendChild(promptBox); cmp.appendChild(cmpRow);
    cmp.appendChild(modelTag); cmp.appendChild(output); cmp.appendChild(cmpNote);

    // --- 播放（每步约 1.5 秒，箭头有流动动画）---
    function stopPlay() {
      state.playing = false;
      if (state.timer) { clearTimeout(state.timer); state.timer = null; }
      playBtn.textContent = '播放整条管线';
    }
    function playStep(i) {
      if (!state.playing || !rootEl.isConnected) return stopPlay();
      if (i >= ITEMS.length) { stopPlay(); update(); return; }
      state.sel = i;
      update();
      state.timer = setTimeout(function () { playStep(i + 1); }, ITEMS[i].kind === 'edge' ? 1100 : 1500);
    }
    playBtn.addEventListener('click', function () {
      if (state.playing) { stopPlay(); update(); return; }
      state.playing = true;
      playBtn.textContent = '停止播放';
      playStep(0);
    });

    function update() {
      ITEMS.forEach(function (item, i) {
        var sel = i === state.sel, r = refs[i];
        if (item.kind === 'node') {
          r.rect.setAttribute('fill', sel ? 'var(--accent-soft)' : 'var(--panel-2)');
          r.rect.setAttribute('stroke', sel ? 'var(--accent)' : 'var(--border)');
          r.rect.setAttribute('stroke-width', sel ? '2.5' : '1.5');
        } else {
          var c = sel ? 'var(--accent)' : 'var(--fg-muted)';
          r.line.setAttribute('stroke', c);
          r.line.setAttribute('stroke-width', sel ? '3' : '2');
          r.head.setAttribute('fill', c);
          r.label.setAttribute('fill', sel ? 'var(--accent)' : 'var(--fg-muted)');
          r.line.setAttribute('class', sel && state.playing ? 'ch01w-flow' : '');
        }
      });
      var item = ITEMS[state.sel];
      var isNode = item.kind === 'node';
      var color = isNode ? 'var(--accent)' : 'var(--accent-2)';
      badge.textContent = isNode ? '阶段' : '数据流';
      badge.style.color = color; badge.style.borderColor = color;
      heading.textContent = item.name + (item.en ? '　' + item.en : '');
      what.textContent = item.what;
      fieldEls[0].textContent = item.input;
      fieldEls[1].textContent = item.output;
      fieldEls[2].textContent = item.chapter;
      insight.textContent = '解读：' + item.insight;
      ['base', 'rlhf'].forEach(function (k) {
        var active = state.compare === k;
        cmpBtns[k].style.outline = active ? '2px solid var(--accent)' : '';
        cmpBtns[k].style.background = active ? 'var(--accent-soft)' : '';
        cmpBtns[k].setAttribute('aria-pressed', active);
      });
      var cData = COMPARE[state.compare];
      modelTag.textContent = '模型：' + cData.model;
      output.textContent = cData.text;
      cmpNote.textContent = cData.note;
    }

    rootEl.appendChild(ctrlRow);
    rootEl.appendChild(svgWrap);
    rootEl.appendChild(card);
    rootEl.appendChild(cmp);
    update();
  }

  window.ChapterWidget = {
    title: 'RLHF 三步骤互动管线',
    intro: '点击管线中的节点或箭头，查看每个阶段做什么、输入数据的量级、产物与对应章节；按「播放整条管线」看数据如何从基础模型一路流向对齐模型，再用下方对照卡感受 RLHF 前后的差异。',
    render: render
  };
})();
