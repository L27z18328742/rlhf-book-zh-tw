/* 第 16 章：评估 —— 「这个分数差是真的吗？」评估噪声模拟器 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var RUNS = 50;
  var N_MIN = 30, N_MAX = 3000;
  var PRESETS = [
    { name: 'AIME', n: 30 },
    { name: 'GPQA Diamond', n: 198 },
    { name: 'MATH-500', n: 500 },
    { name: 'MMLU', n: 14042 }
  ];

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'style') el.setAttribute('style', attrs[k]);
      else el[k] = attrs[k];
    });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function s(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(el);
    return el;
  }
  function sliderToN(v) { return Math.round(N_MIN * Math.pow(N_MAX / N_MIN, v / 100)); }
  function nToSlider(n) { return Math.max(0, Math.min(100, Math.round(100 * Math.log(n / N_MIN) / Math.log(N_MAX / N_MIN)))); }
  function binomial(n, p) { var k = 0; for (var i = 0; i < n; i++) if (Math.random() < p) k++; return k; }
  function benchName(n) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].n === n) return PRESETS[i].name;
    return null;
  }

  var state = { pA: 0.55, pB: 0.58, n: 30, scoresA: [], scoresB: [] };

  function simulate() {
    state.scoresA = []; state.scoresB = [];
    for (var i = 0; i < RUNS; i++) {
      state.scoresA.push(binomial(state.n, state.pA) / state.n * 100);
      state.scoresB.push(binomial(state.n, state.pB) / state.n * 100);
    }
  }

  window.ChapterWidget = {
    title: '这个分数差是真的吗？—— 评估噪声模拟器',
    intro: '同一颗模型、同一个基准，重跑一次评测分数就会不一样。拖动两个模型的真实能力与评测集题数，' +
      '按「跑 50 次评测」看看：排行榜上的分数差，有多少其实只是抽样噪声（呼应 16.2「为何许多外部评估比较不可靠」与附录 C）。',

    render: function (root) {
      // ---------- 控制面板 ----------
      var pASlider = h('input', { type: 'range', min: 0.30, max: 0.90, step: 0.01, value: state.pA });
      var pBSlider = h('input', { type: 'range', min: 0.30, max: 0.90, step: 0.01, value: state.pB });
      var nSlider = h('input', { type: 'range', min: 0, max: 100, step: 1, value: nToSlider(state.n) });
      var pALabel = h('span', { style: 'font-weight:600;color:var(--accent);min-width:3.2em;display:inline-block;' });
      var pBLabel = h('span', { style: 'font-weight:600;color:var(--accent-2);min-width:3.2em;display:inline-block;' });
      var nLabel = h('span', { style: 'font-weight:600;color:var(--fg);' });
      var runBtn = h('button', { text: '🎲 跑 50 次评测' });

      function mkCtl(labelText, slider, valueEl) {
        var wrap = h('div', { style: 'flex:1 1 210px;min-width:200px;' });
        wrap.appendChild(h('div', { text: labelText, style: 'font-size:.85rem;color:var(--fg-muted);margin-bottom:.25rem;' }));
        var row = h('div', { style: 'display:flex;align-items:center;gap:.6rem;' });
        slider.style.flex = '1'; row.appendChild(slider); row.appendChild(valueEl);
        wrap.appendChild(row);
        return wrap;
      }
      var presetRow = h('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:.6rem;' });
      presetRow.appendChild(h('span', { text: '默认基准规模：', style: 'font-size:.85rem;color:var(--fg-muted);' }));
      PRESETS.forEach(function (p) {
        var b = h('button', { className: 'secondary', text: p.name + '（' + p.n.toLocaleString() + ' 题）' });
        b.addEventListener('click', function () { state.n = p.n; nSlider.value = nToSlider(p.n); update(true); });
        presetRow.appendChild(b);
      });

      var ctlPanel = h('div', { className: 'widget-panel' });
      var ctlRow = h('div', { className: 'widget-row' });
      ctlRow.appendChild(mkCtl('模型 A 真实能力 p_A（每题答对概率）', pASlider, pALabel));
      ctlRow.appendChild(mkCtl('模型 B 真实能力 p_B', pBSlider, pBLabel));
      ctlRow.appendChild(mkCtl('评测集题数 n（对数刻度）', nSlider, nLabel));
      ctlPanel.appendChild(ctlRow);
      ctlPanel.appendChild(presetRow);
      ctlPanel.appendChild(h('div', { style: 'margin-top:.7rem;' }, runBtn));

      // ---------- 图表与统计 ----------
      var chartPanel = h('div', { className: 'widget-panel', style: 'margin-top:1rem;' });
      var svgRoot = s('svg', { viewBox: '0 0 720 300', preserveAspectRatio: 'xMidYMid meet', style: 'width:100%;height:auto;display:block;' });
      chartPanel.appendChild(svgRoot);
      var statRow = h('div', { style: 'display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.8rem;' });
      var statEls = {};
      [['overlap', '两分布重叠比例'], ['wins', 'A 赢 B 的次数'], ['seA', 'σ_A（标准误）'], ['seB', 'σ_B（标准误）'], ['seDiff', '分差的噪声尺度 σ_diff']].forEach(function (d) {
        var tile = h('div', { style: 'flex:1 1 120px;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:.55rem .7rem;' });
        tile.appendChild(h('div', { text: d[1], style: 'font-size:.72rem;color:var(--fg-muted);' }));
        statEls[d[0]] = h('div', { style: 'font-size:1.05rem;font-weight:700;color:var(--fg);margin-top:.15rem;' });
        tile.appendChild(statEls[d[0]]);
        statRow.appendChild(tile);
      });
      chartPanel.appendChild(statRow);

      // ---------- 动态解读 ----------
      var verdict = h('div', {
        className: 'widget-panel',
        style: 'margin-top:1rem;border-left:3px solid var(--accent);background:var(--accent-soft);'
      });
      var verdictText = h('div', { style: 'color:var(--fg);line-height:1.7;font-size:.92rem;' });
      verdict.appendChild(h('div', { text: '📖 怎么解读？', style: 'font-weight:700;margin-bottom:.3rem;color:var(--fg);' }));
      verdict.appendChild(verdictText);

      // ---------- 绘图 ----------
      function draw() {
        while (svgRoot.firstChild) svgRoot.removeChild(svgRoot.firstChild);
        var all = state.scoresA.concat(state.scoresB, [state.pA * 100, state.pB * 100]);
        var lo = Math.floor(Math.min.apply(null, all)) - 1;
        var hi = Math.ceil(Math.max.apply(null, all)) + 1;
        if (hi - lo < 2) { lo -= 1; hi += 1; }
        var X0 = 46, X1 = 706, HY = 168; // 直方图基线
        function x(v) { return X0 + (v - lo) / (hi - lo) * (X1 - X0); }

        // 直方图（两色半透明叠加）
        var bins = 26, bw = (hi - lo) / bins, cA = [], cB = [], i, idx;
        for (i = 0; i < bins; i++) { cA.push(0); cB.push(0); }
        state.scoresA.forEach(function (v) { idx = Math.min(bins - 1, Math.floor((v - lo) / bw)); cA[idx]++; });
        state.scoresB.forEach(function (v) { idx = Math.min(bins - 1, Math.floor((v - lo) / bw)); cB[idx]++; });
        var maxC = Math.max(1, Math.max.apply(null, cA.concat(cB)));
        for (i = 0; i < bins; i++) {
          var bx = x(lo + i * bw), bwPx = (X1 - X0) / bins - 1;
          if (cA[i]) s('rect', { x: bx, y: HY - cA[i] / maxC * 130, width: bwPx, height: cA[i] / maxC * 130, fill: 'var(--accent)', 'fill-opacity': '0.45' }, svgRoot);
          if (cB[i]) s('rect', { x: bx, y: HY - cB[i] / maxC * 130, width: bwPx, height: cB[i] / maxC * 130, fill: 'var(--accent-2)', 'fill-opacity': '0.45' }, svgRoot);
        }
        // 真实能力虚线
        [[state.pA, 'var(--accent)', '真实 A'], [state.pB, 'var(--accent-2)', '真实 B']].forEach(function (d, j) {
          var px = x(d[0] * 100);
          s('line', { x1: px, y1: 18, x2: px, y2: 268, stroke: d[1], 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svgRoot);
          s('text', { x: px + 4, y: 26 + j * 13, fill: d[1], 'font-size': 11, text: d[2] + ' = ' + (d[0] * 100).toFixed(0) + '%' }, svgRoot);
        });
        // 座标轴与刻度
        s('line', { x1: X0, y1: HY, x2: X1, y2: HY, stroke: 'var(--border)', 'stroke-width': 1 }, svgRoot);
        var span = hi - lo, step = [1, 2, 5, 10, 20][[1, 2, 5, 10, 20].findIndex(function (t) { return span / t <= 8; })] || 20;
        for (var t = Math.ceil(lo / step) * step; t <= hi; t += step) {
          s('line', { x1: x(t), y1: HY, x2: x(t), y2: HY + 4, stroke: 'var(--fg-muted)' }, svgRoot);
          s('text', { x: x(t), y: HY + 16, fill: 'var(--fg-muted)', 'font-size': 10, 'text-anchor': 'middle', text: t + '%' }, svgRoot);
        }
        s('text', { x: X1, y: HY + 30, fill: 'var(--fg-muted)', 'font-size': 10, 'text-anchor': 'end', text: '单次评测分数（答对率 %）' }, svgRoot);
        // 抖动散点（每模型一条带）
        [[state.scoresA, 205, 'var(--accent)', '模型 A'], [state.scoresB, 245, 'var(--accent-2)', '模型 B']].forEach(function (d) {
          s('text', { x: 4, y: d[1] + 4, fill: d[2], 'font-size': 11, 'font-weight': 700, text: d[3] }, svgRoot);
          s('line', { x1: X0, y1: d[1], x2: X1, y2: d[1], stroke: 'var(--border)', 'stroke-dasharray': '2 4' }, svgRoot);
          d[0].forEach(function (v) {
            s('circle', { cx: x(v), cy: d[1] + (Math.random() - 0.5) * 22, r: 3.5, fill: d[2], 'fill-opacity': '0.55' }, svgRoot);
          });
        });
        // 图例
        s('rect', { x: X0, y: 8, width: 10, height: 10, fill: 'var(--accent)', 'fill-opacity': '0.45' }, svgRoot);
        s('text', { x: X0 + 14, y: 17, fill: 'var(--fg-muted)', 'font-size': 11, text: '模型 A 的 50 次分数' }, svgRoot);
        s('rect', { x: X0 + 140, y: 8, width: 10, height: 10, fill: 'var(--accent-2)', 'fill-opacity': '0.45' }, svgRoot);
        s('text', { x: X0 + 154, y: 17, fill: 'var(--fg-muted)', 'font-size': 11, text: '模型 B 的 50 次分数' }, svgRoot);
        return { cA: cA, cB: cB };
      }

      // ---------- 统计＋解读 ----------
      function update(resample) {
        state.pA = parseFloat(pASlider.value);
        state.pB = parseFloat(pBSlider.value);
        pALabel.textContent = state.pA.toFixed(2);
        pBLabel.textContent = state.pB.toFixed(2);
        var bn = benchName(state.n);
        nLabel.textContent = 'n = ' + state.n.toLocaleString() + (bn ? '（' + bn + '）' : '');
        if (resample) simulate();
        var hist = draw();
        var overlap = 0;
        for (var i = 0; i < hist.cA.length; i++) overlap += Math.min(hist.cA[i], hist.cB[i]);
        var wins = 0, ties = 0;
        for (i = 0; i < RUNS; i++) {
          if (state.scoresA[i] > state.scoresB[i]) wins++;
          else if (state.scoresA[i] === state.scoresB[i]) ties++;
        }
        var seA = Math.sqrt(state.pA * (1 - state.pA) / state.n) * 100;
        var seB = Math.sqrt(state.pB * (1 - state.pB) / state.n) * 100;
        var seDiff = Math.sqrt(seA * seA + seB * seB);
        var gap = Math.abs(state.pA - state.pB) * 100;
        statEls.overlap.textContent = (overlap / RUNS * 100).toFixed(0) + '%';
        statEls.wins.textContent = wins + ' / ' + RUNS + (ties ? '（平手 ' + ties + '）' : '');
        statEls.seA.textContent = '±' + seA.toFixed(2) + ' 分';
        statEls.seB.textContent = '±' + seB.toFixed(2) + ' 分';
        statEls.seDiff.textContent = '±' + seDiff.toFixed(2) + ' 分';

        var name = bn ? bn + '（' + state.n.toLocaleString() + ' 题）' : '这个 ' + state.n.toLocaleString() + ' 题的评测集';
        var msg;
        if (gap < 0.005) {
          msg = '两模型真实能力完全相同，但 50 次重跑中 A 仍「赢」了 ' + wins + ' 次——排行榜上任何名次差异在此都纯属噪声。';
        } else if (gap < seDiff) {
          msg = '真实差距只有 ' + gap.toFixed(1) + ' 分，远小于分差的噪声尺度 ±' + seDiff.toFixed(1) + ' 分（1σ）。' +
            name + ' 根本分不出谁强：两分布几乎叠在一起，胜负接近掷硬币（A 赢 ' + wins + '/' + RUNS + '）。';
        } else if (gap < 2 * seDiff) {
          msg = '真实差距 ' + gap.toFixed(1) + ' 分落在 1σ～2σ 的灰色地带（σ_diff ≈ ' + seDiff.toFixed(1) + ' 分）。' +
            '单跑一次经常翻盘（A 赢 ' + wins + '/' + RUNS + '）——需要多次重跑取平均，或换更大的评测集，结论才站得住。';
        } else {
          msg = '真实差距 ' + gap.toFixed(1) + ' 分已超过 2σ（σ_diff ≈ ' + seDiff.toFixed(1) + ' 分），' +
            '单次评测大致可信：A 在 50 次中赢了 ' + wins + ' 次。题数够多时，约 1 分的差距才开始有统计意义。';
        }
        var rule = '经验法则：在 ' + name + ' 上，小于 ±' + (2 * seDiff).toFixed(1) + ' 分（2σ）的分数差应一律视为噪声。';
        if (state.n <= 50) rule += ' AIME 只有 30 题——错一题就是 3.3 分，±2 分内的差异完全是噪声。';
        verdictText.innerHTML = msg + '<br>' + rule +
          '<br><span style="color:var(--fg-muted);font-size:.85em;">这还只是「同一套评测流程」下的抽样变异；' +
          '各实验室未公开的客制提示、采样参数与可能的数据污染（contamination），会让跨新闻稿的比较误差更大（见 16.2、16.4；Olmo 3 实测多数后训练评估的标准差在 0.25～1.5 分之间）。</span>';
      }

      // ---------- 附带展示：评估格式对照 ----------
      var FORMATS = {
        fewshot: {
          label: 'few-shot 对数似然（log-likelihood）评分',
          prompt: '### Example 1\nQ: A right triangle has legs of lengths 3 and 4.\n   What is the length of its hypotenuse?\n(A) 5  (B) 6  (C) 7  (D) 8\nCorrect Answer: (A)\n\n### Now answer the new question in the same style:\nQ: Which theorem states that ... ?\n(A) ...  (B) ...  (C) ...  (D) ...\nCorrect Answer: ␣   ← 只比较下一个 token 是 (A)～(D) 的对数概率',
          desc: '模型不生成回答：评测程序直接读取下一个 token 的对数概率，看正确答案字母是否概率最高。结果是确定性的（忽略微小数值差异），常用于预训练评估——因为此时模型还缺乏精确匹配所需的问答格式（见 16.1.1）。'
        },
        cot: {
          label: 'CoT 生成＋精确匹配（exact match）',
          prompt: 'Answer the following multiple-choice question ...\nProvide CONCISE reasoning, and make sure to finish\nthe response with "Therefore, the answer is\n(ANSWER_LETTER)" where (ANSWER_LETTER) is one of\n(A), (B), (C), (D), (E), etc.\n\nQuestion: {question}\n(A) {choice_A}  (B) {choice_B}  ...',
          desc: '模型先写出思维链（CoT）推理，再由正则表达式从生成文字中抓出「Therefore, the answer is (X)」。为了最佳性能几乎总是使用大于零的温度——采样本身就引入随机性，正是上方模拟器展示的噪声来源之一（见 16.1.2、16.1.4，Tülu 3 的 MMLU 提示）。'
        }
      };
      var fmtPanel = h('div', { className: 'widget-panel', style: 'margin-top:1rem;' });
      fmtPanel.appendChild(h('div', { text: '同一题，两种评估格式：分数怎么会不一样？', style: 'font-weight:700;margin-bottom:.5rem;color:var(--fg);' }));
      var fmtSelect = h('select', {});
      fmtSelect.appendChild(h('option', { value: 'fewshot', text: FORMATS.fewshot.label }));
      fmtSelect.appendChild(h('option', { value: 'cot', text: FORMATS.cot.label }));
      var fmtPre = h('pre', { style: 'background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:.8rem;font-size:.78rem;line-height:1.5;overflow-x:auto;white-space:pre;margin:.7rem 0;color:var(--fg);' });
      var fmtDesc = h('div', { style: 'font-size:.88rem;color:var(--fg-muted);line-height:1.7;' });
      function showFormat() {
        var f = FORMATS[fmtSelect.value];
        fmtPre.textContent = f.prompt;
        fmtDesc.textContent = f.desc;
      }
      fmtSelect.addEventListener('change', showFormat);
      fmtPanel.appendChild(fmtSelect);
      fmtPanel.appendChild(fmtPre);
      fmtPanel.appendChild(fmtDesc);
      fmtPanel.appendChild(h('div', {
        style: 'margin-top:.7rem;font-size:.85rem;color:var(--fg);border-left:3px solid var(--accent-2);padding-left:.7rem;line-height:1.7;',
        text: '格式不同，同一个模型的分数可以差很多：格式不匹配甚至能让表现从 60% 掉到接近 0。训练数据的答案格式也会互相冲突——NuminaMath 用 \\boxed{XYZ}、MetaMath 用 The answer is: XYZ，同时训练反而可能更差（见 16.2）。'
      }));

      // ---------- 挂载与事件 ----------
      root.appendChild(ctlPanel);
      root.appendChild(chartPanel);
      root.appendChild(verdict);
      root.appendChild(fmtPanel);

      var rafId = null;
      function queueUpdate() {
        if (rafId) return;
        rafId = requestAnimationFrame(function () { rafId = null; update(true); });
      }
      pASlider.addEventListener('input', queueUpdate);
      pBSlider.addEventListener('input', queueUpdate);
      nSlider.addEventListener('input', function () { state.n = sliderToN(parseInt(nSlider.value, 10)); queueUpdate(); });
      runBtn.addEventListener('click', function () { update(true); });

      showFormat();
      update(true);
    }
  };
})();
