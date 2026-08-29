(function () {
  'use strict';

  var ERAS = {
    origin: { label: '偏好 RL 起源', color: 'var(--accent)',   range: [2007.4, 2018.95] },
    lm:     { label: '语言模型时代', color: 'var(--accent-2)', range: [2018.95, 2022.72] },
    gpt:    { label: 'ChatGPT 时代', color: 'var(--link)',     range: [2022.72, 2026.5] }
  };

  var EVENTS = [
    { t: 2008.3, year: '2008', era: 'origin', title: 'TAMER：人类评分训练智能体',
      desc: '由人类反复为智能体（agent）的行动评分，先学出一个奖励模型（reward model），再用它学习行动策略。这种「先建模人类反馈、再做优化」的两段式设计，正是日后 RLHF 流程的雏形。' },
    { t: 2017.05, year: '2017', era: 'origin', title: 'COACH：反馈调整优势函数',
      desc: '演员-评论家（actor-critic）算法 COACH 利用人类的正向与负向反馈来调整优势函数。它说明除了「先学奖励模型」之外，人类信号还有其他嵌入 RL 更新的方式。' },
    { t: 2017.55, year: '2017', era: 'origin', title: 'Christiano et al.：引入 RLHF',
      desc: '现代 RLHF 最主要的参考文献：让人类在 Atari 智能体的轨迹（trajectories）之间表达偏好，异步训练奖励预测器，智能体再最大化预测出的奖励。它证明在某些领域，让人类比较轨迹比直接与环境互动更有效。' },
    { t: 2018.4, year: '2018', era: 'origin', title: '奖励建模转向对齐研究',
      desc: 'TAMER 被扩展到神经网络（Deep TAMER），奖励建模研究进一步延伸 Christiano 的方法。更关键的转变是：奖励模型开始被提出作为研究对齐（alignment）的一般性方法，而不再只是解决 RL 问题的工具。' },
    { t: 2019.5, year: '2019', era: 'lm', title: '微调语言模型：GPT-2 上的偏好 RL',
      desc: '《Fine-Tuning Language Models from Human Preferences》首次把人类偏好 RL 搬上语言模型。学习奖励模型、KL 距离、反馈流程图等经典概念都在此正式确立，与现代 RLHF 有惊人的相似之处。' },
    { t: 2020.6, year: '2020', era: 'lm', title: '学习摘要：RLHF 的首个杀手级任务',
      desc: '把 RLHF 应用于一般摘要，证明以人类偏好训练的模型能在真实语言任务上超越监督式基准，后续更延伸到书籍的递归式摘要。RLHF 从游戏走进了自然语言处理。' },
    { t: 2021.65, year: '2021', era: 'lm', title: 'WebGPT 等：走向助理行为',
      desc: 'RLHF 被应用到浏览器辅助问答（WebGPT）、附引用来源的回答（GopherCite）与一般对话（Sparrow）。RLHF 从单一任务优化，走向训练「有用且可查证」的助理行为。' },
    { t: 2022.12, year: '2022', era: 'lm', title: 'InstructGPT：指令遵循三阶段',
      desc: '把 RLHF 用于指令遵循，确立「监督微调 → 奖励模型 → RL 优化」的流程，是 ChatGPT 的直接前身。同期研究也定义了奖励模型过度优化与红队测试（red teaming）等关键议题。' },
    { t: 2022.5, year: '2022', era: 'lm', title: 'Anthropic 早期 Claude 大量采用 RLHF',
      desc: 'Anthropic 在 Claude 的早期版本中持续大量使用 RLHF，训练有帮助且无害的对话助理；早期的 RLHF 开源工具也随之出现。把 RLHF 精炼并应用于聊天模型的工作全面展开。' },
    { t: 2022.92, year: '2022', era: 'gpt', title: 'ChatGPT：RLHF 走入大众视野',
      desc: '发布公告明确说明：采用与 InstructGPT 相同的 RLHF 方法训练，仅数据搜集设定略有差异。RLHF 一夕之间从研究技术变成家喻户晓产品背后的关键配方，也是本书聚焦的时代转折点。' },
    { t: 2023.35, year: '2023', era: 'gpt', title: '宪法式 AI 与 Claude',
      desc: 'Anthropic 以一组「宪法」原则让 AI 自己产生反馈来训练 Claude，减少对人工标注的依赖。它展示了人类反馈可以被 AI 反馈放大甚至部分取代，打开 RLAIF 一系列研究。' },
    { t: 2023.8, year: '2023', era: 'gpt', title: 'DPO：直接偏好优化',
      desc: '直接偏好优化（Direct Preference Optimization, DPO）跳过独立的奖励模型与 RL 优化器，直接用偏好数据优化策略，催生出一整族直接对齐算法，大幅降低偏好微调的门槛。' },
    { t: 2024.55, year: '2024', era: 'gpt', title: 'Llama 3、Tülu 3：配方公开化',
      desc: 'Meta 的 Llama 2/3、Nvidia 的 Nemotron、Ai2 的 Tülu 3 等公开权重模型都采用 RLHF 与偏好微调，完整训练配方逐渐透明。RLHF 成长为更广泛的偏好微调（PreFT）领域。' },
    { t: 2025.2, year: '2025', era: 'gpt', title: 'DeepSeek R1 与推理模型',
      desc: '受 OpenAI o1 启发的在线推理方法兴起：针对中间推理步骤的过程奖励、从代码与数学的执行反馈中学习。RLHF 的技术栈被延伸到推理训练，领域仍在快速演进。' }
  ];

  var DEFAULT_IDX = 9; // ChatGPT：时代转折点
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var W = 740, H = 132, AXIS_Y = 92, PAD_L = 26, PAD_R = 18;
  var YEAR_MIN = 2007.4, YEAR_MAX = 2026.5;

  function x(t) { return PAD_L + (t - YEAR_MIN) / (YEAR_MAX - YEAR_MIN) * (W - PAD_L - PAD_R); }

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function render(rootEl) {
    var state = { idx: DEFAULT_IDX, filter: 'all' };

    // --- era 筛选按钮列 ---
    var filterRow = document.createElement('div');
    filterRow.className = 'widget-row';
    filterRow.style.cssText = 'margin-bottom:.75rem;gap:.5rem;';
    var filterBtns = {};
    [['all', '全部'], ['origin', ERAS.origin.label], ['lm', ERAS.lm.label], ['gpt', ERAS.gpt.label]].forEach(function (f) {
      var b = document.createElement('button');
      if (f[0] !== 'all') {
        var swatch = document.createElement('span');
        swatch.style.cssText = 'display:inline-block;width:.6em;height:.6em;border-radius:50%;margin-right:.4em;background:' + ERAS[f[0]].color + ';';
        b.appendChild(swatch);
      }
      b.appendChild(document.createTextNode(f[1]));
      b.addEventListener('click', function () {
        state.filter = f[0];
        var vis = visibleEvents();
        if (vis.indexOf(EVENTS[state.idx]) === -1) state.idx = EVENTS.indexOf(vis[0]);
        update();
      });
      filterBtns[f[0]] = b;
      filterRow.appendChild(b);
    });

    // --- SVG 时间轴 ---
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'overflow-x:auto;padding-bottom:.25rem;';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'RLHF 发展时间轴' });
    svg.style.cssText = 'display:block;width:100%;min-width:620px;height:auto;';
    svgWrap.appendChild(svg);

    Object.keys(ERAS).forEach(function (key) { // 时代底色与标签
      var e = ERAS[key];
      var x0 = x(e.range[0]), x1 = x(e.range[1]);
      var band = svgEl('rect', { x: x0, y: 12, width: x1 - x0, height: AXIS_Y - 4, rx: 4, fill: e.color, opacity: '0.08' });
      var lbl = svgEl('text', { x: x0 + 6, y: 26, 'font-size': '10.5', fill: e.color });
      lbl.textContent = e.label;
      svg.appendChild(band); svg.appendChild(lbl);
    });

    svg.appendChild(svgEl('line', { x1: x(YEAR_MIN), y1: AXIS_Y, x2: x(YEAR_MAX), y2: AXIS_Y, stroke: 'var(--border)', 'stroke-width': '1.5' }));
    for (var yr = 2008; yr <= 2026; yr += 2) { // 年份刻度
      svg.appendChild(svgEl('line', { x1: x(yr), y1: AXIS_Y, x2: x(yr), y2: AXIS_Y + 6, stroke: 'var(--border)', 'stroke-width': '1' }));
      var t = svgEl('text', { x: x(yr), y: AXIS_Y + 20, 'font-size': '10', 'text-anchor': 'middle', fill: 'var(--fg-muted)' });
      t.textContent = yr;
      svg.appendChild(t);
    }

    var dots = EVENTS.map(function (ev, i) { // 事件圆点
      var g = svgEl('g', {});
      g.style.cursor = 'pointer';
      var ring = svgEl('circle', { cx: x(ev.t), cy: AXIS_Y, r: 11.5, fill: 'none', stroke: ERAS[ev.era].color, 'stroke-width': '1.5', visibility: 'hidden' });
      var dot = svgEl('circle', { cx: x(ev.t), cy: AXIS_Y, r: 6, fill: ERAS[ev.era].color, stroke: 'var(--bg)', 'stroke-width': '1.5' });
      var hit = svgEl('circle', { cx: x(ev.t), cy: AXIS_Y, r: 13, fill: 'transparent' });
      var tip = svgEl('title', {});
      tip.textContent = ev.year + '　' + ev.title;
      g.appendChild(ring); g.appendChild(dot); g.appendChild(hit); g.appendChild(tip);
      g.addEventListener('click', function () {
        state.idx = i;
        if (state.filter !== 'all' && ev.era !== state.filter) state.filter = 'all';
        update();
      });
      svg.appendChild(g);
      return { g: g, dot: dot, ring: ring };
    });

    // --- 上一个／下一个导览列 ---
    var navRow = document.createElement('div');
    navRow.className = 'widget-row';
    navRow.style.cssText = 'margin:.5rem 0 .75rem;justify-content:space-between;';
    var prevBtn = document.createElement('button'); prevBtn.textContent = '← 上一个';
    var nextBtn = document.createElement('button'); nextBtn.textContent = '下一个 →';
    var counter = document.createElement('span');
    counter.style.cssText = 'color:var(--fg-muted);font-size:.9rem;';
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });
    navRow.appendChild(prevBtn); navRow.appendChild(counter); navRow.appendChild(nextBtn);

    // --- 事件卡片 ---
    var card = document.createElement('div');
    card.className = 'widget-panel';
    card.style.minHeight = '8em';
    var badge = document.createElement('span');
    badge.style.cssText = 'display:inline-block;padding:.1em .7em;border-radius:999px;font-size:.75rem;border:1px solid;margin-bottom:.5rem;';
    var heading = document.createElement('div');
    heading.style.cssText = 'font-weight:700;font-size:1.05rem;color:var(--fg);margin-bottom:.35rem;';
    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0;line-height:1.75;color:var(--fg);';
    card.appendChild(badge); card.appendChild(heading); card.appendChild(desc);

    function visibleEvents() {
      return state.filter === 'all' ? EVENTS : EVENTS.filter(function (ev) { return ev.era === state.filter; });
    }

    function step(dir) {
      var vis = visibleEvents();
      var pos = vis.indexOf(EVENTS[state.idx]);
      pos = pos === -1 ? 0 : (pos + dir + vis.length) % vis.length; // 循环浏览
      state.idx = EVENTS.indexOf(vis[pos]);
      update();
    }

    function update() {
      var vis = visibleEvents();
      EVENTS.forEach(function (ev, i) {
        var selected = i === state.idx;
        var matched = state.filter === 'all' || ev.era === state.filter;
        dots[i].g.setAttribute('opacity', matched ? '1' : '0.18');
        dots[i].dot.setAttribute('r', selected ? '8.5' : '6');
        dots[i].ring.setAttribute('visibility', selected ? 'visible' : 'hidden');
      });
      Object.keys(filterBtns).forEach(function (k) {
        var active = k === state.filter;
        filterBtns[k].style.outline = active ? '2px solid var(--accent)' : '';
        filterBtns[k].style.background = active ? 'var(--accent-soft)' : '';
        filterBtns[k].setAttribute('aria-pressed', active);
      });
      var ev = EVENTS[state.idx];
      var color = ERAS[ev.era].color;
      badge.textContent = ERAS[ev.era].label;
      badge.style.color = color;
      badge.style.borderColor = color;
      heading.textContent = ev.year + '　' + ev.title;
      desc.textContent = ev.desc;
      counter.textContent = (vis.indexOf(ev) + 1) + ' / ' + vis.length;
    }

    rootEl.appendChild(filterRow);
    rootEl.appendChild(svgWrap);
    rootEl.appendChild(navRow);
    rootEl.appendChild(card);
    update();
  }

  window.ChapterWidget = {
    title: 'RLHF 发展互动时间轴',
    intro: '点击时间轴上的圆点，或用「上一个／下一个」按钮，走一遍 RLHF 从偏好 RL 起源到 ChatGPT 时代的 14 个里程碑；也可以用时代按钮筛选。',
    render: render
  };
})();
