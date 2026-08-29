(function () {
  'use strict';

  // 表 9（Olmo 3）：各评测在多次推论执行之间的标准差
  var BENCH = [
    { name: 'GPQA', sigma: 1.48, group: 'high' },
    { name: 'AlpacaEval 3', sigma: 1.24, group: 'high' },
    { name: 'IFEval', sigma: 0.88, group: 'high' },
    { name: 'ZebraLogic', sigma: 0.56, group: 'stable' },
    { name: 'Omega', sigma: 0.56, group: 'stable' },
    { name: 'AIME 24（Avg@32）', sigma: 0.54, group: 'stable' },
    { name: 'HumanEvalPlus', sigma: 0.46, group: 'stable' },
    { name: 'AgiEval', sigma: 0.43, group: 'stable' },
    { name: 'BigBenchHard', sigma: 0.39, group: 'stable' },
    { name: 'LiveCodeBench（Avg@10）', sigma: 0.29, group: 'vstable' },
    { name: 'MBPPPlus', sigma: 0.27, group: 'vstable' },
    { name: 'MATH', sigma: 0.25, group: 'vstable' },
    { name: 'MMLU', sigma: 0.22, group: 'vstable' },
    { name: 'PopQA', sigma: 0.16, group: 'vstable' }
  ];
  var GROUP = {
    high: { label: '高变异', color: 'var(--accent-2)' },
    stable: { label: '稳定', color: 'var(--accent)' },
    vstable: { label: '非常稳定', color: 'var(--link)' }
  };

  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else node[k] = attrs[k];
    });
    for (var i = 2; i < arguments.length; i++) node.appendChild(arguments[i]);
    return node;
  }
  function svg(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }
  // 标准正态分布 CDF（Abramowitz–Stegun 近似）
  function phi(x) {
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989423 * Math.exp(-x * x / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
  }

  // 两座钟形曲线 + 重叠区示意图
  function drawCurves(box, a, b, sigma) {
    box.textContent = '';
    var W = 600, H = 200, top = 26, base = H - 34;
    var lo = Math.min(a, b) - 3.5 * sigma, hi = Math.max(a, b) + 3.5 * sigma;
    var X = function (v) { return (v - lo) / (hi - lo) * (W - 20) + 10; };
    var Y = function (g) { return base - g * (base - top); }; // g: 0~1 归一化密度
    var pdf = function (v, mu) { return Math.exp(-((v - mu) * (v - mu)) / (2 * sigma * sigma)); };
    var el = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
      'aria-label': '两模型分数分布重叠示意图' });
    var path = function (mu, both) {
      var d = 'M ' + X(lo) + ' ' + base;
      for (var i = 0; i <= 120; i++) {
        var v = lo + (hi - lo) * i / 120;
        var g = both ? Math.min(pdf(v, a), pdf(v, b)) : pdf(v, mu);
        d += ' L ' + X(v).toFixed(1) + ' ' + Y(g).toFixed(1);
      }
      return d + ' L ' + X(hi) + ' ' + base + ' Z';
    };
    el.appendChild(svg('path', { d: path(0, true), fill: 'var(--accent-soft)', stroke: 'none' }));
    el.appendChild(svg('path', { d: path(a), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }));
    el.appendChild(svg('path', { d: path(b), fill: 'none', stroke: 'var(--accent-2)', 'stroke-width': 2 }));
    el.appendChild(svg('line', { x1: 10, y1: base, x2: W - 10, y2: base, stroke: 'var(--border)' }));
    [[a, '模型 A', 'var(--accent)'], [b, '模型 B', 'var(--accent-2)']].forEach(function (m) {
      el.appendChild(svg('line', { x1: X(m[0]), y1: top, x2: X(m[0]), y2: base,
        stroke: m[2], 'stroke-dasharray': '4 3', 'stroke-width': 1 }));
      var left = m[0] <= (a + b) / 2 && a !== b;
      var t = svg('text', { x: X(m[0]) + (left ? -6 : 6), y: top - 8,
        'text-anchor': a === b ? 'middle' : (left ? 'end' : 'start'),
        'font-size': 12, fill: m[2] });
      t.textContent = m[1] + '｜' + m[0];
      el.appendChild(t);
    });
    [lo, (lo + hi) / 2, hi].forEach(function (v) {
      var t = svg('text', { x: X(v), y: H - 16, 'text-anchor': 'middle',
        'font-size': 11, fill: 'var(--fg-muted)' });
      t.textContent = v.toFixed(1);
      el.appendChild(t);
    });
    box.appendChild(el);
  }

  // σ 排序横向条状图
  function buildBars(selectedIdx) {
    var wrap = h('div');
    var maxS = 1.48;
    BENCH.slice().sort(function (x, y) { return y.sigma - x.sigma; }).forEach(function (bm) {
      var sel = BENCH.indexOf(bm) === selectedIdx;
      var row = h('div', { style: 'display:grid;grid-template-columns:minmax(6.5em,10.5em) 1fr 2.6em;' +
        'gap:.5em;align-items:center;padding:.14em .3em;border-radius:4px;' +
        (sel ? 'background:var(--accent-soft);' : '') },
        h('span', { text: bm.name, title: bm.name, style: 'font-size:.74rem;color:var(--fg);overflow:hidden;' +
          'text-overflow:ellipsis;white-space:nowrap;' + (sel ? 'font-weight:700;' : '') }),
        h('div', { style: 'background:var(--panel);border:1px solid var(--border);border-radius:4px;height:.85em;' },
          h('div', { style: 'width:' + (bm.sigma / maxS * 100).toFixed(1) + '%;height:100%;border-radius:3px;' +
            'background:' + GROUP[bm.group].color + ';' })),
        h('span', { text: bm.sigma.toFixed(2), style: 'font-size:.74rem;color:var(--fg-muted);text-align:right;' }));
      wrap.appendChild(row);
    });
    var legend = h('div', { className: 'widget-row', style: 'margin-top:.6em;gap:1em;font-size:.76rem;color:var(--fg-muted);' });
    Object.keys(GROUP).forEach(function (g) {
      legend.appendChild(h('span', {},
        h('span', { style: 'display:inline-block;width:.75em;height:.75em;border-radius:2px;vertical-align:-.08em;' +
          'margin-right:.35em;background:' + GROUP[g].color + ';' }),
        document.createTextNode(GROUP[g].label)));
    });
    wrap.appendChild(legend);
    return wrap;
  }

  window.ChapterWidget = {
    title: '「分数差有意义吗？」评测变异查核器',
    intro: '表 9 显示：同一个模型重复评测，分数本来就会抖动。选一个评测、输入两个模型的分数，' +
      '看看这个差距是超出噪声范围的真实差异，还是单次执行的抽样运气。',
    render: function (root) {
      var panel = h('div', { className: 'widget-panel' });
      var select = h('select', { 'aria-label': '选择评测基准' });
      BENCH.forEach(function (bm, i) {
        select.appendChild(h('option', { value: String(i),
          text: bm.name + '（σ = ' + bm.sigma.toFixed(2) + '，' + GROUP[bm.group].label + '）' }));
      });
      var inA = h('input', { type: 'number', step: '0.1', value: '76.5', style: 'width:6.5em;', 'aria-label': '模型 A 分数' });
      var inB = h('input', { type: 'number', step: '0.1', value: '77.7', style: 'width:6.5em;', 'aria-label': '模型 B 分数' });
      var btn = h('button', { type: 'button', text: '查核' });
      var lbl = function (t, c) { return h('label', { className: 'widget-row', style: 'gap:.4em;' }, h('span', { text: t, style: 'font-size:.85rem;color:var(--fg-muted);' }), c); };
      panel.appendChild(h('div', { className: 'widget-row' },
        lbl('评测', select), lbl('模型 A 分数', inA), lbl('模型 B 分数', inB), btn));

      var card = h('div', { style: 'margin-top:1rem;' });
      var svgBox = h('div', { style: 'margin-top:.8rem;' });
      panel.appendChild(card);
      panel.appendChild(svgBox);

      var barsPanel = h('div', { className: 'widget-panel', style: 'margin-top:1rem;' },
        h('div', { text: '表 9 全览：各评测的标准差 σ（由高到低）', style: 'font-weight:700;margin-bottom:.6em;' }));
      var barsBox = h('div');
      barsPanel.appendChild(barsBox);
      barsPanel.appendChild(h('p', { text: '注意：LiveCodeBench 与 AIME 24 之所以落在稳定区，是因为表中数字已是 Avg@10／Avg@32' +
        '（重复执行取平均）后的结果——单次执行其实吵得多。降噪可以买，但成本很容易迅速膨胀（见 C.2）。',
        style: 'font-size:.8rem;color:var(--fg-muted);margin:.7em 0 0;' }));

      function check() {
        var bm = BENCH[Number(select.value)];
        var a = parseFloat(inA.value), b = parseFloat(inB.value);
        barsBox.textContent = '';
        barsBox.appendChild(buildBars(Number(select.value)));
        if (!isFinite(a) || !isFinite(b)) {
          card.innerHTML = '';
          card.appendChild(h('p', { text: '请先输入两个模型的分数。', style: 'color:var(--accent-2);margin:0;' }));
          svgBox.textContent = '';
          return;
        }
        var diff = Math.abs(a - b), k = diff / bm.sigma;
        var overlap = 2 * phi(-diff / (2 * bm.sigma)) * 100;
        var verdict, tone, advice;
        if (diff === 0) {
          verdict = '两模型分数相同——没有差距可以查核'; tone = 'var(--fg-muted)';
          advice = '分数打平不代表能力相同：在 ' + bm.name + ' 上单次执行本来就会抖动约 ±' + bm.sigma.toFixed(2) +
            ' 分。如 C.3 所建议，重要决策要多跑几个 seed 取平均再比较。';
        } else if (k < 1) {
          verdict = '差 ' + diff.toFixed(1) + ' 分 = ' + k.toFixed(1) + 'σ——很可能只是噪声'; tone = 'var(--accent-2)';
          advice = '这个差距完全落在 ' + bm.name + ' 单次执行的正常抖动范围内，换个随机种子重跑可能就反转了。' +
            '如 C.3 所建议：重要决策要多跑几个 seed 取平均，别凭单次分数选模型。';
        } else if (k < 2) {
          verdict = '差 ' + diff.toFixed(1) + ' 分 = ' + k.toFixed(1) + 'σ——灰色地带，不足以下结论'; tone = 'var(--accent-2)';
          advice = '差距介于 1σ 与 2σ 之间：可能是真实进步，也可能是抽样运气。依 C.3 的建议，' +
            '重要决策要多跑几个 seed 取平均，看差距是否稳定维持后再拍板。';
        } else {
          verdict = '差 ' + diff.toFixed(1) + ' 分 = ' + k.toFixed(1) + 'σ——大概率是真实差异'; tone = 'var(--accent)';
          advice = '差距远超出 ' + bm.name + ' 的单次抖动（σ = ' + bm.sigma.toFixed(2) + '），大概率反映真实能力差异。' +
            '即便如此，C.3 仍提醒：重要决策要多跑几个 seed 取平均，确认不是捡到正向离群值。';
        }
        card.innerHTML = '';
        card.appendChild(h('div', { style: 'border:1px solid ' + tone + ';border-left:5px solid ' + tone +
          ';border-radius:var(--radius, 8px);padding:.8em 1em;background:var(--panel);' },
          h('div', { text: verdict, style: 'font-weight:700;color:' + tone + ';' }),
          h('div', { text: bm.name + '：σ = ' + bm.sigma.toFixed(2) + '（' + GROUP[bm.group].label + '）｜两模型分数分布重叠约 ' +
            overlap.toFixed(0) + '%', style: 'font-size:.82rem;color:var(--fg-muted);margin-top:.35em;' }),
          h('p', { text: advice, style: 'margin:.5em 0 0;font-size:.88rem;color:var(--fg);' })));
        drawCurves(svgBox, a, b, bm.sigma);
      }
      btn.addEventListener('click', check);
      select.addEventListener('change', check);
      root.appendChild(panel);
      root.appendChild(barsPanel);
      check();
    }
  };
})();
