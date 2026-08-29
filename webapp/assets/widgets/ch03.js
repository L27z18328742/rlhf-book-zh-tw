/* 第 3 章互动组件：温控器 RL 模拟器（呼应 3.1.1 agent/environment/state/action/reward 形式化） */
(function () {
  'use strict';

  var N = 100;          // 回合步数（时间视野 T）
  var HEAT = 1.0;       // 暖气加热功率（°C／步）
  var LEAK = 0.05;      // 散热系数
  var NOISE = 0.25;     // 环境随机噪声幅度
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // 可调参数（滑杆）
  var params = { target: 22, outside: 10, eps: 2.0, dead: 0.5 };
  var sim = null;       // 最近一次模拟结果 {T, A, R, G, switches, inBand}
  var rafId = 0;

  // 需在多个函数间共用的 DOM 参照
  var ui = {};

  /* ---------- 环境与策略 ---------- */
  function policy(T, prevOn) { // bang-bang（带死区的迟滞控制）
    if (T < params.target - params.dead) return true;
    if (T > params.target + params.dead) return false;
    return prevOn;
  }
  function rewardFn(T) { // |T−T*|<ε 得 +1，否则按偏差比例惩罚
    var d = Math.abs(T - params.target);
    return d < params.eps ? 1 : -0.5 * d;
  }
  function simulate() {
    var T = [params.outside], A = [], R = [], prevOn = false, G = 0, sw = 0, inBand = 0;
    for (var t = 0; t < N; t++) {
      var on = policy(T[t], prevOn);
      if (t > 0 && on !== prevOn) sw++;
      prevOn = on;
      A.push(on);
      var r = rewardFn(T[t]);
      R.push(r); G += r;
      if (r > 0) inBand++;
      var noise = (Math.random() * 2 - 1) * NOISE;
      T.push(T[t] + (on ? HEAT : 0) - LEAK * (T[t] - params.outside) + noise);
    }
    sim = { T: T, A: A, R: R, G: G, switches: sw, inBand: inBand / N };
  }

  /* ---------- 小工具 ---------- */
  function el(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x, d) { return x.toFixed(d == null ? 1 : d); }

  /* ---------- 图表 ---------- */
  var PL = 46, PR = 710, PT = 16, PB = 208; // 温度图绘图区
  var RZ = 272, RUNIT = 18;                 // 奖励条零线与单位高度
  var scaleY = null;

  function xOf(t) { return PL + (t / N) * (PR - PL); }

  function drawStatic() { // 依当前模拟决定温度轴范围，画座标轴／容忍带／目标线
    var g = ui.gStatic;
    while (g.firstChild) g.removeChild(g.firstChild);
    var lo = Math.min(Math.min.apply(null, sim.T), params.outside, params.target - params.eps) - 1;
    var hi = Math.max(Math.max.apply(null, sim.T), params.target + params.eps) + 1;
    if (hi - lo < 8) { var c = (hi + lo) / 2; lo = c - 4; hi = c + 4; }
    scaleY = function (v) { return PB - (v - lo) / (hi - lo) * (PB - PT); };

    // ±ε 容忍带与目标线
    svg('rect', { x: PL, y: scaleY(params.target + params.eps), width: PR - PL,
      height: scaleY(params.target - params.eps) - scaleY(params.target + params.eps),
      fill: 'var(--accent-soft)' }, g);
    svg('line', { x1: PL, x2: PR, y1: scaleY(params.target), y2: scaleY(params.target),
      stroke: 'var(--accent-2)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, g);
    svg('text', { x: PR - 4, y: scaleY(params.target) - 5, 'text-anchor': 'end',
      'font-size': 11, fill: 'var(--accent-2)' }, g).textContent = '目标 T* ± ε';

    // 温度轴刻度
    var span = hi - lo, step = span > 28 ? 10 : span > 14 ? 5 : 2;
    for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      var y = scaleY(v);
      svg('line', { x1: PL, x2: PR, y1: y, y2: y, stroke: 'var(--border)', 'stroke-width': 1 }, g);
      svg('text', { x: PL - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10,
        fill: 'var(--fg-muted)' }, g).textContent = v + '°';
    }
    // 时间轴刻度
    for (var t = 0; t <= N; t += 25) {
      svg('text', { x: xOf(t), y: 236, 'text-anchor': 'middle', 'font-size': 10,
        fill: 'var(--fg-muted)' }, g).textContent = 't=' + t;
    }
    svg('text', { x: PL, y: PT - 4, 'font-size': 11, fill: 'var(--fg-muted)' }, g)
      .textContent = '室温（°C）　橘色细条＝暖气打开';
    // 奖励区零线与标题
    svg('line', { x1: PL, x2: PR, y1: RZ, y2: RZ, stroke: 'var(--border)', 'stroke-width': 1 }, g);
    svg('text', { x: PL, y: RZ - 24, 'font-size': 11, fill: 'var(--fg-muted)' }, g)
      .textContent = '每步奖励 r（绿＝+1、橘＝惩罚）';
  }

  function drawFrame(upTo) { // 画出前 upTo 步的轨迹、暖气状态条与奖励条
    var g = ui.gDyn;
    while (g.firstChild) g.removeChild(g.firstChild);
    var pts = [];
    for (var t = 0; t <= upTo; t++) pts.push(fmt(xOf(t), 1) + ',' + fmt(scaleY(sim.T[t]), 1));
    svg('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--accent)',
      'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
    var barW = (PR - PL) / N * 0.7;
    for (t = 0; t < upTo; t++) {
      if (sim.A[t]) svg('rect', { x: xOf(t), y: 214, width: (PR - PL) / N + 0.5, height: 6,
        fill: 'var(--accent-2)', opacity: 0.65 }, g);
      var r = Math.max(sim.R[t], -2.5), h = Math.abs(r) * RUNIT;
      svg('rect', { x: xOf(t) - barW / 2, y: r > 0 ? RZ - h : RZ, width: barW, height: h,
        fill: r > 0 ? 'var(--accent)' : 'var(--accent-2)', opacity: 0.85 }, g);
    }
    if (upTo > 0) svg('circle', { cx: xOf(upTo - 1), cy: scaleY(sim.T[upTo - 1]), r: 4,
      fill: 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
  }

  /* ---------- 侧栏（RL 循环即时状态）与解读 ---------- */
  function updateLoopPanel(t) {
    var i = Math.max(0, Math.min(t, N - 1));
    var s = sim.T[i], a = sim.A[i], r = sim.R[i], G = 0;
    for (var k = 0; k <= i; k++) G += sim.R[k];
    ui.stepEl.textContent = '第 t = ' + i + ' 步（共 ' + N + ' 步）';
    ui.sarEl.innerHTML = '状态 s = <b>' + fmt(s) + '°C</b> → 动作 a = <b style="color:var(--accent-2)">' +
      (a ? '打开暖气' : '关闭暖气') + '</b> → 奖励 r = <b style="color:var(--accent)">' +
      (r > 0 ? '+1' : fmt(r, 2)) + '</b>';
    ui.retEl.textContent = fmt(G);
  }

  function interpret() {
    var maxT = params.outside + HEAT / LEAK;
    var pct = Math.round(sim.inBand * 100);
    var parts = [];
    if (maxT < params.target - 0.5) {
      parts.push('暖气全开的平衡温度只有约 ' + fmt(maxT) + '°C，低于目标 ' + fmt(params.target) +
        '°C——环境的转移动态不在智能体的控制范围内，再好的策略也拿不到高报酬。');
    } else {
      parts.push(pct >= 75
        ? '有 ' + pct + '% 的时间落在 ±ε 容忍带内，控制良好，累积回报 G = ' + fmt(sim.G) + '。'
        : '只有 ' + pct + '% 的时间落在容忍带内（含开头升温的试误成本），累积回报 G = ' + fmt(sim.G) + '。');
      if (params.eps <= 1.0) parts.push('ε 调小后奖励函数更严格，同样的行为累积回报下降——奖励设计直接影响我们对行为的评价。');
      else if (params.eps >= 2.8) parts.push('ε 很大时奖励过于宽松，几乎每一步都得 +1，难以分辨策略好坏。');
      if (params.dead <= 0.2) parts.push('死区很小：室温紧贴目标，但暖气切换了 ' + sim.switches + ' 次——精准控制的代价是频繁动作。');
      else if (params.dead >= 1.4) parts.push('死区较大：只切换 ' + sim.switches + ' 次，但温度摆荡变大，可能荡出容忍带。');
    }
    ui.noteEl.textContent = parts.join(' ');
  }

  /* ---------- 执行一次模拟（含播放动画） ---------- */
  function run() {
    cancelAnimationFrame(rafId);
    simulate();
    drawStatic();
    interpret();
    var cur = 0;
    (function tick() {
      cur = Math.min(cur + 2, N);
      drawFrame(cur);
      updateLoopPanel(cur - 1);
      if (cur < N) rafId = requestAnimationFrame(tick);
    })();
  }

  /* ---------- 版面 ---------- */
  function makeSlider(box, label, unit, min, max, stepV, key) {
    var wrap = el('div', 'min-width:140px;flex:1 1 150px;');
    var lab = el('label', 'display:block;margin-bottom:.15rem;');
    var val = el('b', 'color:var(--fg);');
    lab.appendChild(document.createTextNode(label + '　'));
    lab.appendChild(val);
    var input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = stepV;
    input.value = params[key];
    var show = function () { val.textContent = fmt(+input.value) + unit; };
    input.addEventListener('input', function () { params[key] = +input.value; show(); run(); });
    show();
    wrap.appendChild(lab); wrap.appendChild(input);
    box.appendChild(wrap);
  }

  function render(root) {
    // 控制面板
    var ctrl = el('div');
    ctrl.className = 'widget-panel';
    ctrl.style.marginBottom = '1rem';
    var row = el('div');
    row.className = 'widget-row';
    makeSlider(row, '目标温度 T*', '°C', 16, 28, 0.5, 'target');
    makeSlider(row, '室外温度', '°C', -5, 25, 1, 'outside');
    makeSlider(row, '奖励容忍带 ε', '°C', 0.3, 3, 0.1, 'eps');
    makeSlider(row, '策略死区', '°C', 0, 2, 0.1, 'dead');
    ctrl.appendChild(row);
    var row2 = el('div', 'display:flex;flex-wrap:wrap;gap:1rem;align-items:center;margin-top:.8rem;');
    var btn = el('button', '', '重新模拟 ▶');
    btn.addEventListener('click', run);
    var formula = el('span', 'font-size:.95rem;');
    if (window.katex) {
      window.katex.render(
        'r_t = \\begin{cases} +1 & |T_t - T^*| < \\varepsilon \\\\ -0.5\\,|T_t - T^*| & \\text{otherwise} \\end{cases}',
        formula, { throwOnError: false });
    } else {
      formula.textContent = 'r = +1 若 |T−T*|<ε，否则 −0.5·|T−T*|';
    }
    row2.appendChild(btn); row2.appendChild(formula);
    ctrl.appendChild(row2);
    root.appendChild(ctrl);

    // 图表＋侧栏
    var flex = el('div', 'display:flex;flex-wrap:wrap;gap:1rem;align-items:stretch;');
    var chartPanel = el('div', 'flex:2 1 340px;min-width:0;');
    chartPanel.className = 'widget-panel';
    var s = svg('svg', { viewBox: '0 0 720 330', width: '100%',
      role: 'img', 'aria-label': '室温轨迹与每步奖励图' });
    s.style.display = 'block';
    ui.gStatic = svg('g', {}, s);
    ui.gDyn = svg('g', {}, s);
    chartPanel.appendChild(s);
    flex.appendChild(chartPanel);

    var side = el('div', 'flex:1 1 200px;display:flex;flex-direction:column;gap:.55rem;font-size:.85rem;');
    side.className = 'widget-panel';
    side.appendChild(el('div', 'font-weight:700;color:var(--accent);letter-spacing:.05em;', 'RL 循环即时状态'));
    ui.stepEl = el('div', 'color:var(--fg-muted);');
    ui.sarEl = el('div', 'line-height:1.8;');
    side.appendChild(ui.stepEl);
    side.appendChild(ui.sarEl);
    var retBox = el('div', 'margin-top:.2rem;padding:.55rem .8rem;background:var(--code-bg);border:1px solid var(--border);border-radius:8px;');
    retBox.appendChild(el('div', 'font-size:.75rem;color:var(--fg-muted);', '累积回报 G = Σ r（γ = 1）'));
    ui.retEl = el('div', 'font-size:1.5rem;font-weight:700;color:var(--accent);', '0.0');
    retBox.appendChild(ui.retEl);
    side.appendChild(retBox);
    ui.noteEl = el('div', 'margin-top:auto;padding-top:.5rem;border-top:1px dashed var(--border);color:var(--fg-muted);line-height:1.8;');
    side.appendChild(ui.noteEl);
    flex.appendChild(side);
    root.appendChild(flex);

    run();
  }

  window.ChapterWidget = {
    title: '温控器 RL 模拟器',
    intro: '书中 3.1.1 节以温控器说明 RL 的形式化：智能体观察状态（室温 s）、依策略选动作（开／关暖气 a）、从环境获得奖励 r，并累积回报 G。拖动滑杆改变环境（室外温度）、奖励设计（容忍带 ε）与策略（死区），观察同一个循环如何产生不同的行为与报酬。',
    render: render
  };
})();
