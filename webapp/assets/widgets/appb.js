/* 附录 B 互动组件：话多的平衡（Chattiness Balance）体验器 */
(function () {
  'use strict';

  var LEVELS = ['超简短', '简短', '适中', '详尽条列', '过度铺陈'];

  var TEXTS = [
    'RLHF（基于人类反馈的强化学习）是一种利用人类偏好信号来微调语言模型的训练方法。',

    'RLHF 是「基于人类反馈的强化学习」：先让标注者比较模型的多个回复并选出较好的那个，' +
    '用这些偏好数据训练一个奖励模型，再以强化学习让语言模型往人类偏好的方向更新。' +
    'ChatGPT 等聊天助手「好聊」的特质，多半来自这一步。',

    '基于人类反馈的强化学习（RLHF）是机器学习的一个子领域，目标是把人类的判断纳入模型的训练循环。' +
    '流程通常分三步：先以监督式微调让模型学会遵循指令；接着收集人类对成对回复的偏好比较，' +
    '训练出一个奖励模型来近似人类的喜好；最后用 PPO 或 DPO 等算法，' +
    '让语言模型在不偏离原模型太远的前提下最大化这个奖励。\n\n' +
    '相较于手工设计奖励函数，这种做法能捕捉「什么样的回答比较好」这类难以明文定义的主观标准，' +
    '但也面临标注成本高、反馈不一致与奖励黑客（reward hacking）等挑战。',

    '基于人类反馈的强化学习（**RLHF**）是强化学习的一个子集，其中引导学习的奖励由人类提供，' +
    '而非预先指定的数值奖励函数。这在难以设计奖励函数、或期望的表现涉及主观判断时特别有用。\n\n' +
    '**核心组成：**\n\n' +
    '1. **人类输入：** 反馈来自人类评估者的定性判断，形式包含数值评分、二元偏好、自然语言反馈或示范。\n' +
    '2. **奖励模型：** 原始人类反馈存在变异与偏误，需先训练奖励模型，把偏好转换成稳定的学习信号。\n' +
    '3. **策略优化：** 以 PPO、DPO 等算法迭代更新模型，使其行为逐步贴近人类偏好。\n\n' +
    '**应用领域：**\n\n' +
    '- **对话助手：** 让回复更有帮助、无害且诚实。\n' +
    '- **机器人学：** 教机器人执行难以用奖励函数描述的任务。\n' +
    '- **推荐系统：** 用人类反馈调整并改善推荐质量。\n\n' +
    '**主要挑战：**\n\n' +
    '1. **可扩展性：** 收集人类反馈既耗时又昂贵。\n' +
    '2. **偏误与噪声：** 人类反馈不一致，可能导致次佳的学习结果。\n' +
    '3. **对齐与奖励黑客：** 模型可能只学会讨好表面信号，而非真正的人类偏好。',

    '这是一个非常好的问题！基于人类反馈的强化学习（RLHF，Reinforcement Learning from Human ' +
    'Feedback）是一个内容相当丰富的主题，以下我将尽可能完整地为您说明。\n\n' +
    '首先，需要说明的是，RLHF 是一种利用人类偏好来训练语言模型的方法。换句话说，' +
    '它让人类的反馈参与模型的学习过程。也就是说，模型的训练信号来自人类的判断，' +
    '而不是预先定义的奖励函数。\n\n' +
    '**详细流程如下：**\n\n' +
    '1. **监督式微调：** 首先，模型会先经过监督式微调。这一步非常重要，因为它是后续一切训练的基础；' +
    '没有这一步，后面的步骤将难以进行。\n' +
    '2. **偏好收集：** 接着会收集人类的偏好数据。值得一提的是，这些数据的质量会直接影响最终效果，' +
    '因此数据质量非常关键，务必重视数据质量。\n' +
    '3. **奖励模型训练：** 然后训练奖励模型。如前所述，奖励模型的作用是把人类偏好转换成训练信号，' +
    '这正是第 2 步收集偏好数据的目的所在。\n' +
    '4. **强化学习：** 最后进行强化学习优化。这一步会用到前面所有步骤的成果，' +
    '也就是说，它集成了前述的一切。\n\n' +
    '**不过，需要注意的是**，实际效果可能因模型规模、数据质量与具体应用情境而异，以上内容仅供参考，' +
    '不构成任何工程决策建议。在实际部署前，建议咨询相关领域的专业人士，并进行充分的评估与测试。' +
    '同时也要提醒您，AI 领域发展迅速，本说明可能无法涵盖最新的进展。\n\n' +
    '总结来说，RLHF 就是用人类反馈来训练模型的方法——正如开头所说，' +
    '它让人类的判断参与模型的学习过程。希望以上说明对您有帮助！' +
    '如果您还有任何其他问题，欢迎随时提出，我很乐意为您进一步说明！'
  ];

  /* 「适中」档的 DPO 对照版：同样的内容，更长、更结构化（呼应 Tülu 3 SFT vs DPO） */
  var DPO_TEXT =
    '基于人类反馈的强化学习（**RLHF**）是让语言模型对齐人类偏好的核心技术：' +
    '引导学习的奖励信号来自人类判断，而非预先写定的奖励函数。\n\n' +
    '典型流程包含三个阶段：\n\n' +
    '1. **监督式微调（SFT）：** 以人工示范数据训练模型遵循指令，作为后续训练的起点。\n' +
    '2. **奖励模型训练：** 收集标注者对成对回复的偏好比较（被选 ≻ 被拒），' +
    '训练一个能为任意回复打分的奖励模型。\n' +
    '3. **强化学习优化：** 以 PPO 或 DPO 等算法更新策略，在最大化奖励的同时，' +
    '以 KL 惩罚约束模型不要偏离参考模型太远。\n\n' +
    '**为什么重要：** 这种做法能捕捉「什么样的回答比较好」这类难以明文定义的主观标准，' +
    '是 ChatGPT 等助手好用的关键。\n\n' +
    '**主要挑战：** 标注成本高、人类反馈充满噪声与偏误，' +
    '以及模型可能学会钻奖励的漏洞（奖励黑客）。';

  var INTERPS = [
    '一句话回答的信息密度最高，但在成对比较中，评审常觉得它「不够周全」——精简的答案很容易输给看起来更完整的对手。',
    '简短但有内容。Starling Beta 这类模型示范了「长得刚好」：平均回应变长了，但增加的方式确实帮助到人类评分者。',
    '接近甜蜜点。评审（人类与 LLM）平均偏好较长、较完整的回复——这是 RLHF 模型越来越啰唆的原因之一。试试切换上方的 SFT／DPO 对照。',
    '偏好微调的典型风格：粗体、编号、条列清单。胜率仍高，但每个字承载的信息已开始稀释——「话多」不只是长度，也包含格式编排。',
    '超过甜蜜点后，冗长反而伤害体验，但自动评测不一定罚得到——这正是 AlpacaEval 与 WildBench 加入线性长度校正机制的原因。'
  ];
  var INTERP_DPO =
    '同样的内容，DPO 版多了结构、粗体与编号，长度也明显增加——长度与格式编排正是偏好微调最一致的「指纹」，且已被反复证明与评审偏好相关。';

  var CSS = '' +
    '.appbw-q{font-weight:700;color:var(--fg);}' +
    '.appbw-q code{background:var(--code-bg);border-radius:6px;padding:2px 8px;font-size:.9em;}' +
    '.appbw-toggle{margin-left:auto;display:flex;gap:6px;}' +
    '.appbw-toggle button.is-active{background:var(--accent-soft);border-color:var(--accent);color:var(--fg);}' +
    '.appbw-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:12px 0;}' +
    '.appbw-meta{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:.78rem;color:var(--fg-muted);}' +
    '.appbw-badge{padding:2px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-2);border:1px solid var(--border);}' +
    '.appbw-count{margin-left:auto;}' +
    '.appbw-text{color:var(--fg);font-size:.92rem;line-height:1.85;max-height:300px;overflow-y:auto;transition:opacity .18s ease;}' +
    '.appbw-text p{margin:0 0 10px;white-space:pre-wrap;}' +
    '.appbw-text p:last-child{margin-bottom:0;}' +
    '.appbw-note{margin-top:10px;padding-top:8px;border-top:1px dashed var(--border);color:var(--fg-muted);font-size:.82rem;}' +
    '.appbw-sliderrow{align-items:center;margin-top:16px;}' +
    '.appbw-sliderrow label{color:var(--fg);font-size:.9rem;white-space:nowrap;}' +
    '.appbw-sliderrow input[type=range]{flex:1;min-width:120px;}' +
    '.appbw-levels{display:flex;justify-content:space-between;font-size:.76rem;color:var(--fg-muted);margin-top:4px;}' +
    '.appbw-levels span.is-active{color:var(--accent);font-weight:700;}' +
    '.appbw-legend{display:flex;flex-wrap:wrap;gap:16px;font-size:.8rem;color:var(--fg-muted);margin:16px 0 6px;}' +
    '.appbw-legend i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px;}' +
    '.appbw-chart svg{width:100%;height:auto;display:block;}' +
    '.appbw-interp{background:var(--accent-soft);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-top:12px;color:var(--fg);font-size:.88rem;line-height:1.7;}';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, parent) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }
  function svg(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  /* 依 \n\n 分段、支持 **粗体** 的极简渲染 */
  function renderRich(target, text) {
    target.textContent = '';
    text.split('\n\n').forEach(function (block) {
      var p = el('p', '', target);
      var parts = block.split(/\*\*([^*]+)\*\*/g);
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        if (i % 2 === 1) el('strong', '', p).textContent = parts[i];
        else p.appendChild(document.createTextNode(parts[i]));
      }
    });
  }

  /* 曲线：人类偏好胜率（倒 U，峰值中间偏右）与信息密度（单调下降） */
  function fPref(t) { return 0.16 + 0.74 * Math.exp(-Math.pow(t - 0.58, 2) / (2 * 0.2 * 0.2)); }
  function fDens(t) { return 0.10 + 0.85 * Math.exp(-2.1 * t); }

  function render(rootEl) {
    var state = { value: 45, mode: 'sft' };

    var style = document.createElement('style');
    style.textContent = CSS;
    rootEl.appendChild(style);

    /* ── 顶列：提问 + SFT/DPO 切换 ── */
    var top = el('div', 'widget-row', rootEl);
    top.style.alignItems = 'center';
    var q = el('div', 'appbw-q', top);
    q.appendChild(document.createTextNode('提问：'));
    el('code', '', q).textContent = '什么是 RLHF？';
    var toggle = el('div', 'appbw-toggle', top);
    var btnSft = el('button', 'is-active', toggle); btnSft.type = 'button'; btnSft.textContent = 'SFT 模型';
    var btnDpo = el('button', '', toggle); btnDpo.type = 'button'; btnDpo.textContent = 'DPO 模型';

    /* ── 展示卡 ── */
    var card = el('div', 'appbw-card', rootEl);
    var meta = el('div', 'appbw-meta', card);
    var badge = el('span', 'appbw-badge', meta);
    var levelTag = el('span', '', meta);
    var count = el('span', 'appbw-count', meta);
    var textEl = el('div', 'appbw-text', card);
    var note = el('div', 'appbw-note', card);

    /* ── 滑杆 ── */
    var row = el('div', 'widget-row appbw-sliderrow', rootEl);
    var lab = el('label', '', row); lab.textContent = '回复详尽度';
    lab.htmlFor = 'appbw-range';
    var range = el('input', '', row);
    range.type = 'range'; range.id = 'appbw-range';
    range.min = '0'; range.max = '100'; range.value = String(state.value);
    var levelsBar = el('div', 'appbw-levels', rootEl);
    var levelSpans = LEVELS.map(function (name) {
      var s = el('span', '', levelsBar); s.textContent = name; return s;
    });

    /* ── SVG 曲线图 ── */
    var legend = el('div', 'appbw-legend', rootEl);
    var l1 = el('span', '', legend); var i1 = el('i', '', l1); i1.style.background = 'var(--accent)';
    l1.appendChild(document.createTextNode('人类偏好胜率'));
    var l2 = el('span', '', legend); var i2 = el('i', '', l2); i2.style.background = 'var(--accent-2)';
    l2.appendChild(document.createTextNode('信息密度'));

    var W = 560, PL = 16, PR = 16, PT = 18, BOT = 188;
    function tx(t) { return PL + t * (W - PL - PR); }
    function ty(v) { return BOT - v * (BOT - PT); }
    function path(fn) {
      var d = '';
      for (var i = 0; i <= 60; i++) {
        var t = i / 60;
        d += (i ? 'L' : 'M') + tx(t).toFixed(1) + ',' + ty(fn(t)).toFixed(1);
      }
      return d;
    }
    var chart = el('div', 'appbw-chart', rootEl);
    var s = svg('svg', { viewBox: '0 0 560 232', role: 'img', 'aria-label': '回复长度与偏好胜率、信息密度的关系图' }, chart);
    /* 甜蜜点区带 */
    svg('rect', { x: tx(0.48), y: PT, width: tx(0.68) - tx(0.48), height: BOT - PT, fill: 'var(--accent-soft)' }, s);
    svg('text', { x: tx(0.58), y: PT + 12, 'text-anchor': 'middle', 'font-size': '11', fill: 'var(--fg-muted)' }, s)
      .textContent = '甜蜜点';
    /* 座标轴与档位刻度 */
    svg('line', { x1: PL, y1: BOT, x2: W - PR, y2: BOT, stroke: 'var(--border)', 'stroke-width': 1.5 }, s);
    LEVELS.forEach(function (name, i) {
      var x = tx(0.1 + i * 0.2);
      svg('line', { x1: x, y1: BOT, x2: x, y2: BOT + 5, stroke: 'var(--border)' }, s);
      svg('text', { x: x, y: BOT + 18, 'text-anchor': 'middle', 'font-size': '10.5', fill: 'var(--fg-muted)' }, s)
        .textContent = name;
    });
    svg('text', { x: W - PR, y: BOT + 36, 'text-anchor': 'end', 'font-size': '11', fill: 'var(--fg-muted)' }, s)
      .textContent = '回复长度 →';
    /* 两条曲线 */
    svg('path', { d: path(fPref), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, s);
    svg('path', { d: path(fDens), fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, s);
    /* 当前位置标记 */
    var marker = svg('line', { y1: PT, y2: BOT, stroke: 'var(--fg-muted)', 'stroke-dasharray': '4 3' }, s);
    var dotPref = svg('circle', { r: 4.5, fill: 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, s);
    var dotDens = svg('circle', { r: 4.5, fill: 'var(--accent-2)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, s);

    /* ── 动态解读 ── */
    var interp = el('div', 'appbw-interp', rootEl);

    function levelOf(v) { return Math.min(4, Math.floor(v / 20)); }
    function currentText(lv) {
      return (state.mode === 'dpo' && lv === 2) ? DPO_TEXT : TEXTS[lv];
    }

    var lastKey = null, fadeTimer = null;
    function updateCard(lv) {
      var key = lv + '-' + state.mode;
      if (key === lastKey) return;
      lastKey = key;
      var text = currentText(lv);
      textEl.style.opacity = '0';
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () {
        renderRich(textEl, text);
        textEl.scrollTop = 0;
        textEl.style.opacity = '1';
      }, 180);
      badge.textContent = state.mode === 'dpo' ? 'DPO 模型' : 'SFT 模型';
      levelTag.textContent = '档位：' + LEVELS[lv];
      count.textContent = '约 ' + text.replace(/\*\*/g, '').replace(/\s/g, '').length + ' 字';
      levelSpans.forEach(function (sp, i) { sp.classList.toggle('is-active', i === lv); });
      interp.textContent = (state.mode === 'dpo' && lv === 2) ? INTERP_DPO : INTERPS[lv];
      if (state.mode === 'dpo' && lv !== 2) {
        note.style.display = '';
        note.textContent = 'SFT／DPO 对照文本以「适中」档最完整——把滑杆移到中段，看 DPO 如何把同样的内容变得更长、更结构化。';
      } else {
        note.style.display = 'none';
      }
    }
    function updateMarker() {
      var x = tx(state.value / 100).toFixed(1);
      marker.setAttribute('x1', x); marker.setAttribute('x2', x);
      dotPref.setAttribute('cx', x); dotPref.setAttribute('cy', ty(fPref(state.value / 100)).toFixed(1));
      dotDens.setAttribute('cx', x); dotDens.setAttribute('cy', ty(fDens(state.value / 100)).toFixed(1));
    }

    range.addEventListener('input', function () {
      state.value = Number(range.value);
      updateMarker();
      updateCard(levelOf(state.value));
    });
    btnSft.addEventListener('click', function () {
      state.mode = 'sft';
      btnSft.classList.add('is-active'); btnDpo.classList.remove('is-active');
      updateCard(levelOf(state.value));
    });
    btnDpo.addEventListener('click', function () {
      state.mode = 'dpo';
      btnDpo.classList.add('is-active'); btnSft.classList.remove('is-active');
      updateCard(levelOf(state.value));
    });

    updateMarker();
    updateCard(levelOf(state.value));
  }

  window.ChapterWidget = {
    title: '话多的平衡体验器',
    intro: '拖动「回复详尽度」滑杆，观察同一个提问在五种详尽度下的示范回复，并对照曲线图上的人类偏好胜率（倒 U 型）与信息密度（单调下降）；再切换 SFT／DPO 模型，体会偏好微调如何让回复变得更长、更结构化。',
    render: render
  };
})();
