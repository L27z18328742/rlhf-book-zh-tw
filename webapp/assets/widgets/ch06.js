/* 第 6 章互动组件：PPO / GRPO 互动游乐场 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.style.cssText = style;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgText(parent, x, y, str, attrs) {
    var a = { x: x, y: y, 'font-size': 11, fill: 'var(--fg-muted)' };
    if (attrs) for (var k in attrs) a[k] = attrs[k];
    var t = svgEl('text', a, parent);
    t.textContent = str;
    return t;
  }
  function tex(node, src) {
    if (window.katex) window.katex.render(src, node, { throwOnError: false, displayMode: true });
    else node.textContent = src;
  }
  function fmt(x) { var v = Math.round(x * 100) / 100; if (v === 0) v = 0; return v.toFixed(2); }
  function sliderRow(labelText, min, max, step, value, onInput) {
    var wrap = el('label', 'display:flex;align-items:center;gap:.5rem;font-size:.88rem;flex:1 1 240px;min-width:220px;');
    wrap.appendChild(el('span', 'white-space:nowrap;', labelText));
    var input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
    input.style.cssText = 'flex:1;min-width:100px;';
    var val = el('span', 'font-variant-numeric:tabular-nums;font-weight:600;color:var(--accent);min-width:3.2em;text-align:right;', fmt(value));
    input.addEventListener('input', function () { val.textContent = fmt(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(val);
    return { row: wrap, input: input, val: val };
  }

  /* ---------- 分页 1：PPO 裁剪目标 ---------- */
  function buildPPOTab() {
    var st = { eps: 0.2, A: 1, rho: 1.35 };
    var X_MAX = 2.5, W = 640, H = 300, PAD = { l: 48, r: 16, t: 16, b: 40 };
    var plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;

    var panel = el('div'); panel.className = 'widget-panel';
    var ctrl = el('div'); ctrl.className = 'widget-row';
    ctrl.appendChild(sliderRow('裁剪系数 ε', 0.05, 0.5, 0.01, st.eps, function (v) { st.eps = v; update(); }).row);
    ctrl.appendChild(sliderRow('优势 A', -2, 2, 0.05, st.A, function (v) { st.A = v; update(); }).row);
    panel.appendChild(ctrl);

    var formulaEl = el('div', 'overflow-x:auto;margin:.3rem 0;');
    panel.appendChild(formulaEl);

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'width:100%;height:auto;display:block;touch-action:none;cursor:crosshair;' });
    panel.appendChild(svg);
    panel.appendChild(el('p', 'margin:.25rem 0 0;font-size:.78rem;color:var(--fg-muted);', '在图上按住并拖曳，即可移动 ρ 光标点。'));

    // 图例
    var legend = el('div', 'display:flex;flex-wrap:wrap;gap:.4rem 1rem;margin-top:.4rem;font-size:.8rem;color:var(--fg-muted);');
    [['var(--accent)', 'solid', 'PPO 目标 J(ρ)'], ['var(--fg-muted)', 'dashed', '未裁剪的 ρA'], ['var(--accent-soft)', 'fill', '梯度归零区（被裁剪）']].forEach(function (it) {
      var chip = el('span', 'display:inline-flex;align-items:center;gap:.35rem;');
      var mark = el('span', it[1] === 'fill'
        ? 'width:1rem;height:.75rem;background:' + it[0] + ';border:1px solid var(--border);border-radius:2px;'
        : 'width:1.2rem;height:0;border-top:2.5px ' + it[1] + ' ' + it[0] + ';');
      chip.appendChild(mark); chip.appendChild(document.createTextNode(it[2]));
      legend.appendChild(chip);
    });
    panel.appendChild(legend);

    var readout = el('p', 'margin:.7rem 0 0;font-size:.88rem;font-variant-numeric:tabular-nums;');
    var interp = el('p', 'margin:.45rem 0 0;font-size:.85rem;color:var(--fg-muted);line-height:1.7;');
    panel.appendChild(readout); panel.appendChild(interp);

    function sx(r) { return PAD.l + (r / X_MAX) * plotW; }
    function objective(rho) {
      var clipped = Math.min(Math.max(rho, 1 - st.eps), 1 + st.eps);
      return Math.min(rho * st.A, clipped * st.A);
    }

    function update() {
      var eps = st.eps, A = st.A;
      var yMax = Math.max(1, X_MAX * Math.abs(A)) * 1.12;
      function sy(v) { return PAD.t + ((yMax - v) / (2 * yMax)) * plotH; }
      svg.textContent = '';

      // 梯度归零区着色（呼应 6.2.6 的逐情况分析）
      if (A > 0.005) svgEl('rect', { x: sx(1 + eps), y: PAD.t, width: sx(X_MAX) - sx(1 + eps), height: plotH, fill: 'var(--accent-soft)' }, svg);
      else if (A < -0.005) svgEl('rect', { x: sx(0), y: PAD.t, width: sx(1 - eps) - sx(0), height: plotH, fill: 'var(--accent-soft)' }, svg);

      // 座标格线与刻度
      [0, 0.5, 1, 1.5, 2, 2.5].forEach(function (x) {
        svgEl('line', { x1: sx(x), y1: PAD.t, x2: sx(x), y2: PAD.t + plotH, stroke: 'var(--border)', 'stroke-width': 1 }, svg);
        svgText(svg, sx(x), H - PAD.b + 16, String(x), { 'text-anchor': 'middle' });
      });
      svgEl('line', { x1: sx(0), y1: sy(0), x2: sx(X_MAX), y2: sy(0), stroke: 'var(--border)', 'stroke-width': 1.5 }, svg);
      svgText(svg, PAD.l - 7, sy(0) + 4, '0', { 'text-anchor': 'end' });
      [yMax / 1.12, -yMax / 1.12].forEach(function (y) {
        svgText(svg, PAD.l - 7, sy(y) + 4, fmt(y), { 'text-anchor': 'end' });
      });

      // 信赖区域边界 1±ε
      [1 - eps, 1 + eps].forEach(function (b, i) {
        svgEl('line', { x1: sx(b), y1: PAD.t, x2: sx(b), y2: PAD.t + plotH, stroke: 'var(--accent-2)', 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0.7 }, svg);
        svgText(svg, sx(b), PAD.t - 3, i === 0 ? '1−ε' : '1+ε', { 'text-anchor': 'middle', fill: 'var(--accent-2)' });
      });

      // 未裁剪的 ρA（虚线对照）
      svgEl('line', { x1: sx(0), y1: sy(0 * A), x2: sx(X_MAX), y2: sy(X_MAX * A), stroke: 'var(--fg-muted)', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: 0.8 }, svg);

      // PPO 目标：分段线性，只需在转折点取值
      var pts = [0, 1 - eps, 1 + eps, X_MAX].map(function (r) { return sx(r) + ',' + sy(objective(r)); }).join(' ');
      svgEl('polyline', { points: pts, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }, svg);

      // ρ 光标点
      var j = objective(st.rho);
      var clippedHere = (A > 0.005 && st.rho > 1 + eps) || (A < -0.005 && st.rho < 1 - eps);
      svgEl('line', { x1: sx(st.rho), y1: PAD.t, x2: sx(st.rho), y2: PAD.t + plotH, stroke: 'var(--accent-2)', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      svgEl('circle', { cx: sx(st.rho), cy: sy(j), r: 6, fill: 'var(--accent-2)', stroke: 'var(--panel)', 'stroke-width': 2 }, svg);

      // 轴名
      svgText(svg, PAD.l + plotW / 2, H - 5, 'ρ（策略比值 π_θ / π_θold）', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)' });
      svgText(svg, 13, PAD.t + plotH / 2, 'J（目标值）', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)', transform: 'rotate(-90 13 ' + (PAD.t + plotH / 2) + ')' });

      tex(formulaEl, 'J(\\theta)=\\min\\!\\big(\\rho A,\\ \\operatorname{clip}(\\rho,\\,' + fmt(1 - eps) + ',\\,' + fmt(1 + eps) + ')\\,A\\big),\\qquad A=' + fmt(A));

      readout.textContent = 'ρ = ' + fmt(st.rho) + '，J = ' + fmt(j) + ' — ' +
        (Math.abs(A) <= 0.005 ? '优势为 0，处处无梯度。'
          : clippedHere ? '此处梯度被裁剪归零：目标为平坦区，这一步不做任何更新。'
            : '此处未被裁剪：执行一般的策略梯度步（' + (A > 0 ? '提高' : '降低') + '该动作的概率）。');
      readout.style.color = clippedHere ? 'var(--accent-2)' : 'var(--fg)';

      if (Math.abs(A) <= 0.005) {
        interp.textContent = 'A ≈ 0：目标处处为 0，没有任何学习信号——优势的正负号与大小，决定了整条曲线的形状。';
      } else if (A > 0) {
        interp.textContent = '正优势（A > 0）：想提高此动作的概率。在 ρ ≤ ' + fmt(1 + eps) + '（含整个信赖区域与左侧）目标就是 ρA，照常做策略梯度步；但一旦 ρ > 1+ε = ' + fmt(1 + eps) + '，目标在 (1+ε)A = ' + fmt((1 + eps) * A) + ' 处饱和、梯度为 0——避免过度强化一个已经被充分表达的动作。';
      } else {
        interp.textContent = '负优势（A < 0）：想降低此动作的概率。在 ρ ≥ ' + fmt(1 - eps) + ' 时目标为 ρA，照常做策略梯度步（往左压低概率）；但一旦 ρ < 1−ε = ' + fmt(1 - eps) + '，目标在 (1−ε)A = ' + fmt((1 - eps) * A) + ' 处饱和、梯度为 0——避免过度压制一个已经被抑制的动作。';
      }
    }

    function rhoFromEvent(ev) {
      var rect = svg.getBoundingClientRect();
      var x = ((ev.clientX - rect.left) / rect.width) * W;
      return Math.min(X_MAX, Math.max(0, ((x - PAD.l) / plotW) * X_MAX));
    }
    var dragging = false;
    svg.addEventListener('pointerdown', function (ev) {
      dragging = true;
      if (svg.setPointerCapture) { try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 忽略 */ } }
      st.rho = rhoFromEvent(ev); update();
    });
    svg.addEventListener('pointermove', function (ev) { if (dragging) { st.rho = rhoFromEvent(ev); update(); } });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointercancel', function () { dragging = false; });

    update();
    return panel;
  }

  /* ---------- 分页 2：GRPO 群组优势 ---------- */
  function buildGRPOTab() {
    var G = 8;
    var st = { r: [1, 0, 1, 1, 0, 1, 0, 0] };
    var W = 640, H = 240, PAD = { l: 46, r: 14, t: 20, b: 30 };
    var plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;

    var panel = el('div'); panel.className = 'widget-panel';
    var formulaEl = el('div', 'overflow-x:auto;margin:.2rem 0 .4rem;');
    tex(formulaEl, '\\hat{A}_i=\\frac{r_i-\\operatorname{mean}(r_1,\\dots,r_G)}{\\operatorname{std}(r_1,\\dots,r_G)},\\qquad G=8');
    panel.appendChild(formulaEl);

    // 默认按钮
    var btnRow = el('div'); btnRow.className = 'widget-row';
    btnRow.appendChild(el('span', 'font-size:.88rem;', '一组 G = 8 个 rollout 的奖励 r：'));
    [['随机', function () { return Math.round(Math.random() * 20) / 20; }],
     ['全对', function () { return 1; }],
     ['全错', function () { return 0; }]].forEach(function (p) {
      var b = el('button', 'font-size:.85rem;', p[0]);
      b.addEventListener('click', function () {
        for (var i = 0; i < G; i++) { st.r[i] = p[1](); sliders[i].input.value = st.r[i]; sliders[i].val.textContent = fmt(st.r[i]); }
        update();
      });
      btnRow.appendChild(b);
    });
    panel.appendChild(btnRow);

    // 8 支奖励滑杆
    var grid = el('div', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.25rem .9rem;margin-top:.5rem;');
    var sliders = [];
    for (var i = 0; i < G; i++) {
      (function (idx) {
        var s = sliderRow('r' + (idx + 1), 0, 1, 0.05, st.r[idx], function (v) { st.r[idx] = v; update(); });
        s.row.style.minWidth = '0'; s.row.style.flex = '';
        sliders.push(s); grid.appendChild(s.row);
      })(i);
    }
    panel.appendChild(grid);

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'width:100%;height:auto;display:block;margin-top:.5rem;' });
    panel.appendChild(svg);

    var statLine = el('p', 'margin:.5rem 0 0;font-size:.88rem;font-variant-numeric:tabular-nums;');
    var interp = el('div', 'margin-top:.5rem;padding:.6rem .8rem;border:1px solid var(--border);border-radius:8px;font-size:.85rem;line-height:1.7;background:var(--panel-2);color:var(--fg-muted);');
    panel.appendChild(statLine); panel.appendChild(interp);

    function update() {
      var mean = st.r.reduce(function (a, b) { return a + b; }, 0) / G;
      var varc = st.r.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / G;
      var std = Math.sqrt(varc);
      var degenerate = std < 1e-6;
      var adv = st.r.map(function (r) { return degenerate ? 0 : (r - mean) / std; });

      var maxAbs = adv.reduce(function (a, b) { return Math.max(a, Math.abs(b)); }, 0);
      var yMax = Math.max(1.5, maxAbs * 1.15);
      function sy(v) { return PAD.t + ((yMax - v) / (2 * yMax)) * plotH; }
      svg.textContent = '';

      // 零线（退化时以警示色强调）
      svgEl('line', { x1: PAD.l, y1: sy(0), x2: W - PAD.r, y2: sy(0), stroke: degenerate ? 'var(--accent-2)' : 'var(--border)', 'stroke-width': degenerate ? 2 : 1.5 }, svg);
      [1, -1].forEach(function (y) {
        if (y < yMax) {
          svgEl('line', { x1: PAD.l, y1: sy(y), x2: W - PAD.r, y2: sy(y), stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
          svgText(svg, PAD.l - 6, sy(y) + 4, (y > 0 ? '+1' : '−1'), { 'text-anchor': 'end' });
        }
      });
      svgText(svg, PAD.l - 6, sy(0) + 4, '0', { 'text-anchor': 'end' });
      svgText(svg, 13, PAD.t + plotH / 2, 'Â（群组优势）', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)', transform: 'rotate(-90 13 ' + (PAD.t + plotH / 2) + ')' });

      var slot = plotW / G, bw = slot * 0.55;
      adv.forEach(function (a, k) {
        var cx = PAD.l + slot * k + slot / 2;
        var y0 = sy(Math.max(0, a)), hgt = Math.abs(sy(a) - sy(0));
        svgEl('rect', {
          x: cx - bw / 2, y: y0, width: bw, height: Math.max(hgt, degenerate ? 3 : hgt), rx: 2,
          fill: degenerate ? 'var(--accent-2)' : (a >= 0 ? 'var(--accent)' : 'var(--accent-2)'),
          opacity: degenerate ? 0.55 : 0.9
        }, svg);
        svgText(svg, cx, a >= 0 ? y0 - 5 : y0 + hgt + 13, fmt(a), { 'text-anchor': 'middle', fill: 'var(--fg)' });
        svgText(svg, cx, H - PAD.b + 16, 'r' + (k + 1) + '=' + fmt(st.r[k]), { 'text-anchor': 'middle', 'font-size': 10 });
      });

      statLine.textContent = 'mean(r) = ' + fmt(mean) + '，std(r) = ' + fmt(std) +
        (degenerate ? '，所有 Â = 0' : '，max |Â| = ' + fmt(maxAbs));

      if (degenerate) {
        interp.style.borderColor = 'var(--accent-2)';
        interp.style.color = 'var(--accent-2)';
        interp.textContent = '警示：全对或全错时 std → 0，群组优势全为 0——这一批样本里没有任何对比，GRPO 在这批样本上学不到东西。这正是课程设计（curriculum）重要的原因：题目难度必须落在模型「有时对、有时错」的区间，群组内才有可供比较的学习信号。';
      } else {
        interp.style.borderColor = 'var(--border)';
        interp.style.color = 'var(--fg-muted)';
        interp.textContent = '群组内有对比信号：高于群组平均的样本得到正优势（被强化），低于平均者得到负优势（被压制）。以 std 归一化让不同题目间的优势尺度可比；也请注意——接近全对／全错时 std 变小，少数「异类」样本的 |Â| 会被放得很大（这正是 Dr. GRPO 讨论的偏差来源）。';
      }
    }

    update();
    return panel;
  }

  /* ---------- 分页框架 ---------- */
  function render(rootEl) {
    var tabBar = el('div', 'display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap;');
    var tabs = [
      { label: '① PPO 裁剪目标', build: buildPPOTab },
      { label: '② GRPO 群组优势', build: buildGRPOTab }
    ];
    var buttons = [], panes = [];
    function activate(idx) {
      buttons.forEach(function (b, i) {
        var on = i === idx;
        b.style.borderColor = on ? 'var(--accent)' : '';
        b.style.color = on ? 'var(--accent)' : '';
        b.style.background = on ? 'var(--accent-soft)' : '';
        b.style.fontWeight = on ? '600' : '';
        b.setAttribute('aria-pressed', String(on));
        panes[i].style.display = on ? '' : 'none';
      });
    }
    tabs.forEach(function (t, i) {
      var b = el('button', 'font-size:.9rem;', t.label);
      b.addEventListener('click', function () { activate(i); });
      buttons.push(b); tabBar.appendChild(b);
    });
    rootEl.appendChild(tabBar);
    tabs.forEach(function (t) {
      var pane = t.build();
      panes.push(pane); rootEl.appendChild(pane);
    });
    activate(0);
  }

  window.ChapterWidget = {
    title: 'PPO / GRPO 互动游乐场',
    intro: '分页一：调整裁剪系数 ε 与优势 A，拖动 ρ 光标，观察 PPO 裁剪目标如何在信赖区域外把梯度归零；分页二：拖动一组 G=8 个 rollout 的奖励，看 GRPO 群组归一化优势如何产生对比信号——以及全对／全错时为何学不到东西。',
    render: render
  };
})();
