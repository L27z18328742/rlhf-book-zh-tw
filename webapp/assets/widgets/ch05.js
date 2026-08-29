/* 第 5 章互动组件：Bradley-Terry 奖励模型探索器 */
(function () {
  'use strict';

  // ---------- 数学工具 ----------
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const softplus = (x) => (x > 30 ? x : Math.log1p(Math.exp(x))); // 数值稳定
  const nll = (d) => softplus(-d); // -log σ(d)
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const fmt = (v, d) => (Object.is(v, -0) ? 0 : v).toFixed(d == null ? 3 : d);

  // ---------- DOM 小工具 ----------
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'style') n.style.cssText = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => n.appendChild(c));
    return n;
  }
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function svgText(attrs, str) { const t = svgEl('text', attrs); t.textContent = str; return t; }
  function tex(node, src) {
    if (window.katex) window.katex.render(src, node, { throwOnError: false, displayMode: true });
    else node.textContent = src;
  }
  function makeSlider(labelHTML, min, max, step, value, oninput) {
    const lab = el('label', { style: 'flex:1 1 200px; min-width:170px; font-size:.9rem;' });
    const head = el('div', { style: 'display:flex; justify-content:space-between; margin-bottom:.15rem;' });
    const name = el('span'); name.innerHTML = labelHTML;
    const val = el('span', { style: 'color:var(--accent); font-variant-numeric:tabular-nums; font-weight:600;' });
    head.appendChild(name); head.appendChild(val);
    const input = el('input', { type: 'range', min, max, step, value, style: 'width:100%;' });
    input.addEventListener('input', () => oninput(parseFloat(input.value)));
    lab.appendChild(head); lab.appendChild(input);
    return { lab, input, val };
  }
  function statBox(label) {
    const v = el('div', { style: 'font-size:1.1rem; font-weight:700; color:var(--accent); font-variant-numeric:tabular-nums;' });
    const box = el('div', { style: 'flex:1 1 130px; background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:.5rem .75rem;' }, [
      el('div', { text: label, style: 'font-size:.78rem; color:var(--fg-muted);' }), v,
    ]);
    return { box, v };
  }

  // ================= 分页 1：偏好概率 =================
  function buildTab1() {
    const st = { rc: 0.8, rr: -0.8, m: 0 };
    const W = 560, H = 280, PAD = { l: 46, r: 14, t: 14, b: 40 }, X_MIN = -10, X_MAX = 10;
    const sx = (x) => PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
    const sy = (y) => PAD.t + (1 - y) * (H - PAD.t - PAD.b);

    const eqMain = el('div'), eqNow = el('div', { style: 'margin-top:.3rem;' });
    tex(eqMain, 'P(y_c \\succ y_r \\mid x) = \\sigma\\big(r_\\theta(y_c\\mid x) - r_\\theta(y_r\\mid x)\\big),\\qquad ' +
      '\\mathcal{L} = -\\log\\sigma(\\Delta - m),\\quad \\Delta = r_c - r_r');
    const eqPanel = el('div', { class: 'widget-panel', style: 'overflow-x:auto;' }, [eqMain, eqNow]);

    const sRc = makeSlider('被选回复分数 r<sub>c</sub>', -5, 5, 0.1, st.rc, (v) => { st.rc = v; update(); });
    const sRr = makeSlider('被拒回复分数 r<sub>r</sub>', -5, 5, 0.1, st.rr, (v) => { st.rr = v; update(); });
    const sM = makeSlider('偏好边际 m（Llama 2 式，0 = 关闭）', 0, 3, 0.1, st.m, (v) => { st.m = v; update(); });
    const controls = el('div', { class: 'widget-panel' }, [el('div', { class: 'widget-row' }, [sRc.lab, sRr.lab, sM.lab])]);

    const stD = statBox('分差 Δ = r_c − r_r'), stP = statBox('偏好概率 P = σ(Δ)'), stL = statBox('NLL 损失 −log σ(Δ − m)');
    const stats = el('div', { class: 'widget-panel' }, [el('div', { class: 'widget-row' }, [stD.box, stP.box, stL.box])]);

    // Sigmoid 曲线图
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'width:100%; height:auto; display:block;' });
    for (let x = X_MIN; x <= X_MAX; x += 2) {
      svg.appendChild(svgEl('line', { x1: sx(x), y1: sy(0), x2: sx(x), y2: sy(1), stroke: 'var(--border)', 'stroke-width': x === 0 ? 1.5 : 1 }));
      svg.appendChild(svgText({ x: sx(x), y: H - PAD.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--fg-muted)' }, x));
    }
    [0, 0.25, 0.5, 0.75, 1].forEach((y) => {
      svg.appendChild(svgEl('line', { x1: sx(X_MIN), y1: sy(y), x2: sx(X_MAX), y2: sy(y), stroke: 'var(--border)', 'stroke-dasharray': y === 0.5 ? '4 4' : 'none' }));
      svg.appendChild(svgText({ x: PAD.l - 7, y: sy(y) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--fg-muted)' }, y));
    });
    svg.appendChild(svgText({ x: sx(0), y: H - 4, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fg)' }, 'Δ = r_c − r_r（分差）'));
    svg.appendChild(svgText({ x: 13, y: sy(0.5), 'font-size': 12, fill: 'var(--fg)', 'text-anchor': 'middle', transform: 'rotate(-90 13 ' + sy(0.5) + ')' }, 'P(chosen ≻ rejected)'));
    let d = '';
    for (let i = 0; i <= 200; i++) { const x = X_MIN + (i / 200) * (X_MAX - X_MIN); d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ',' + sy(sigmoid(x)).toFixed(1) + ' '; }
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5 }));
    const guideV = svgEl('line', { stroke: 'var(--accent-2)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }); svg.appendChild(guideV);
    const guideH = svgEl('line', { stroke: 'var(--accent-2)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }); svg.appendChild(guideH);
    const dot = svgEl('circle', { r: 6, fill: 'var(--accent-2)', stroke: 'var(--panel)', 'stroke-width': 2 }); svg.appendChild(dot);
    const dotTag = svgText({ 'font-size': 11, 'font-weight': 700, fill: 'var(--accent-2)' }, ''); svg.appendChild(dotTag);
    const chartPanel = el('div', { class: 'widget-panel' }, [svg]);
    const interp = el('div', { class: 'widget-panel', style: 'font-size:.92rem; line-height:1.7;' });

    function update() {
      const dz = st.rc - st.rr, P = sigmoid(dz), L = nll(dz - st.m);
      sRc.val.textContent = fmt(st.rc, 1); sRr.val.textContent = fmt(st.rr, 1); sM.val.textContent = fmt(st.m, 1);
      stD.v.textContent = fmt(dz, 2); stP.v.textContent = fmt(P); stL.v.textContent = fmt(L);
      tex(eqNow, '\\text{目前：}\\ \\sigma(' + fmt(st.rc, 1) + ' - (' + fmt(st.rr, 1) + ')) = \\sigma(' + fmt(dz, 2) + ') = ' + fmt(P) +
        ',\\qquad \\mathcal{L} = -\\log\\sigma(' + fmt(dz, 2) + (st.m > 0 ? ' - ' + fmt(st.m, 1) : '') + ') = ' + fmt(L));
      dot.setAttribute('cx', sx(dz)); dot.setAttribute('cy', sy(P));
      guideV.setAttribute('x1', sx(dz)); guideV.setAttribute('y1', sy(0)); guideV.setAttribute('x2', sx(dz)); guideV.setAttribute('y2', sy(P));
      guideH.setAttribute('x1', sx(X_MIN)); guideH.setAttribute('y1', sy(P)); guideH.setAttribute('x2', sx(dz)); guideH.setAttribute('y2', sy(P));
      dotTag.setAttribute('x', clamp(sx(dz) + 10, PAD.l, W - 130)); dotTag.setAttribute('y', clamp(sy(P) - 10, 22, H - PAD.b - 6));
      dotTag.textContent = 'Δ=' + fmt(dz, 2) + ', P=' + fmt(P, 2);
      let msg;
      if (Math.abs(dz) < 0.15) msg = '分差 ≈ 0：模型完全无法区分两个回复，P ≈ 0.5，损失 ≈ log 2 ≈ 0.693——随机猜测的水平，也是奖励头刚初始化、尚未训练时的典型状态。';
      else if (dz >= 4) msg = '分差很大：P = ' + fmt(P) + '，sigmoid 已饱和，损失趋近 0。这笔样本几乎不再产生梯度，继续拉大分差的边际效益极小。';
      else if (dz >= 1) msg = '模型已明确偏好被选回复（P = ' + fmt(P, 2) + '），损失降至 ' + fmt(L) + '。−log σ(Δ) 的梯度随 Δ 增大而衰减，之后的更新会越来越温和。';
      else if (dz > 0) msg = '模型略偏好被选回复，但信心不足：P 只比 0.5 高一点，损失仍接近 0.693，梯度会持续推动 r_c 上升、r_r 下降以扩大分差。';
      else if (dz > -4) msg = '排序错了：模型给被拒回复更高分（P = ' + fmt(P, 2) + ' < 0.5），损失 ' + fmt(L) + ' 高于 0.693，而且错得越多梯度越大——这笔样本会被强力修正。';
      else msg = '严重排反：σ(Δ) ≈ 0，−log σ(Δ) 近似线性成长（≈ |Δ| = ' + fmt(-dz, 1) + '），这笔样本会主导整个批次的梯度。';
      if (st.m > 0) msg += ' 目前打开边际 m = ' + fmt(st.m, 1) + '：损失改以 σ(Δ − m) 计算（式 19），chosen 至少要高出 ' + fmt(st.m, 1) + ' 分损失才会压低——标注的偏好强度越大，要求的分差就越大。';
      interp.innerHTML = '<strong>解读：</strong>' + msg;
    }
    update();
    return el('div', { style: 'display:flex; flex-direction:column; gap:1rem;' }, [eqPanel, controls, stats, chartPanel, interp]);
  }

  // ================= 分页 2：训练奖励模型 =================
  const PAIRS = [
    { q: '什么是奖励模型？', c: '奖励模型读入提示与回复，输出一个标量分数，作为 RLHF 下游优化的代理信号。', r: '奖励模型就是一种会给奖励的模型。', qc: 2.5, qr: -1.5 },
    { q: '把「今天天气很好」翻成英文。', c: 'The weather is really nice today.', r: 'Today weather very good.', qc: 1.5, qr: -0.5 },
    { q: '台北 101 有多高？', c: '台北 101 高 508 公尺，2004 年落成时是世界第一高楼。', r: '印象中大概五百公尺左右吧。', qc: 2.0, qr: 0.8 },
    { q: '推荐一部科幻电影。', c: '推荐《星际效应》：黑洞的视觉呈现与配乐都极为出色。', r: '推荐《黑客任务》，很经典。', qc: 1.2, qr: 0.7 },
    { q: '如何煮出好吃的白饭？', c: '洗米后以 1:1.1 的水量浸泡二十分钟再炊煮，起锅前再焖十分钟。', r: '把米加水丢进电锅按下去就好。', qc: 1.8, qr: 0.2 },
    { q: '写一句鼓励人的话。', c: '每一步微小的前进，都是明天回头时最好的风景。', r: '加油。', qc: 1.0, qr: -0.8 },
  ];
  PAIRS.forEach((p) => { p.gap = p.qc - p.qr; p.pstar = sigmoid(p.gap); });
  const FLOOR = PAIRS.reduce((s, p) => s + (p.pstar * nll(p.gap) + (1 - p.pstar) * nll(-p.gap)), 0) / PAIRS.length;
  const LR = 0.5, AUTO_STEPS = 50;

  function buildTab2() {
    const st = { rc: PAIRS.map(() => 0), rr: PAIRS.map(() => 0), step: 0, sel: 0, note: '', timer: null };
    const history = [];
    const pairLoss = (i) => { const d = st.rc[i] - st.rr[i]; return PAIRS[i].pstar * nll(d) + (1 - PAIRS[i].pstar) * nll(-d); };
    const avgLoss = () => PAIRS.reduce((s, _, i) => s + pairLoss(i), 0) / PAIRS.length;
    history.push(avgLoss());

    const eqMain = el('div');
    tex(eqMain, '\\mathcal{L} = -\\big[p^{*}\\log\\sigma(\\Delta) + (1-p^{*})\\log\\sigma(-\\Delta)\\big],\\qquad ' +
      'r_c \\mathrel{+}= \\eta\\,(p^{*} - \\sigma(\\Delta)),\\quad r_r \\mathrel{-}= \\eta\\,(p^{*} - \\sigma(\\Delta))');
    const eqNote = el('p', { style: 'margin:.3rem 0 0; font-size:.85rem; color:var(--fg-muted);',
      text: '每一对回复各有「隐藏真实质量」q。标注者依 Bradley-Terry 模型行事：把质量较高者选为 chosen 的比例为 p* = σ(q_c − q_r)。上式即 BT 的 NLL 损失对 p* 取期望后的解析梯度更新（η = ' + LR + '）。' });
    const eqPanel = el('div', { class: 'widget-panel', style: 'overflow-x:auto;' }, [eqMain, eqNote]);

    const btnStep = el('button', { type: 'button', text: '训练一步' });
    const btnAuto = el('button', { type: 'button', text: '自动训练 ' + AUTO_STEPS + ' 步' });
    const btnShift = el('button', { type: 'button', text: '所有分数 +1' });
    const btnReset = el('button', { type: 'button', text: '重设' });
    const stStep = statBox('训练步数'), stLoss = statBox('平均 BT 损失'), stFloor = statBox('噪声下限（标注不一致）');
    stFloor.v.textContent = fmt(FLOOR);
    const controls = el('div', { class: 'widget-panel' }, [
      el('div', { class: 'widget-row', style: 'gap:.5rem;' }, [btnStep, btnAuto, btnShift, btnReset]),
      el('div', { class: 'widget-row', style: 'margin-top:.6rem;' }, [stStep.box, stLoss.box, stFloor.box]),
    ]);

    // ---- 条状图：12 个 reward ----
    const W = 560, BH = 250, BP = { l: 46, r: 14, t: 16, b: 34 }, Y = 3.2;
    const by = (v) => BP.t + (1 - (clamp(v, -Y, Y) + Y) / (2 * Y)) * (BH - BP.t - BP.b);
    const bars = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + BH, style: 'width:100%; height:auto; display:block;' });
    for (let v = -3; v <= 3; v++) {
      bars.appendChild(svgEl('line', { x1: BP.l, y1: by(v), x2: W - BP.r, y2: by(v), stroke: 'var(--border)', 'stroke-width': v === 0 ? 1.5 : 1 }));
      bars.appendChild(svgText({ x: BP.l - 7, y: by(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--fg-muted)' }, v));
    }
    bars.appendChild(svgText({ x: 13, y: by(0), 'font-size': 12, fill: 'var(--fg)', 'text-anchor': 'middle', transform: 'rotate(-90 13 ' + by(0) + ')' }, 'reward'));
    const gw = (W - BP.l - BP.r) / PAIRS.length, bw = gw * 0.26;
    const refs = PAIRS.map((_, i) => {
      const x0 = BP.l + i * gw;
      const selRect = svgEl('rect', { x: x0 + 2, y: BP.t - 6, width: gw - 4, height: BH - BP.t - BP.b + 12, rx: 6, fill: 'var(--accent-soft)', opacity: 0 });
      bars.appendChild(selRect);
      const bc = svgEl('rect', { x: x0 + gw * 0.18, width: bw, fill: 'var(--accent)', rx: 2 });
      const br = svgEl('rect', { x: x0 + gw * 0.56, width: bw, fill: 'var(--accent-2)', rx: 2 });
      const tc = svgEl('line', { x1: x0 + gw * 0.12, x2: x0 + gw * 0.18 + bw + gw * 0.06, stroke: 'var(--fg)', 'stroke-width': 1.4, 'stroke-dasharray': '4 3', opacity: 0.7 });
      const tr = svgEl('line', { x1: x0 + gw * 0.5, x2: x0 + gw * 0.56 + bw + gw * 0.06, stroke: 'var(--fg)', 'stroke-width': 1.4, 'stroke-dasharray': '4 3', opacity: 0.7 });
      bars.appendChild(bc); bars.appendChild(br); bars.appendChild(tc); bars.appendChild(tr);
      bars.appendChild(svgText({ x: x0 + gw / 2, y: BH - BP.b + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--fg-muted)' }, '第 ' + (i + 1) + ' 对'));
      const hit = svgEl('rect', { x: x0, y: 0, width: gw, height: BH, fill: 'transparent', style: 'cursor:pointer;' });
      hit.addEventListener('click', () => { st.sel = i; update(); });
      bars.appendChild(hit);
      return { bc, br, tc, tr, selRect };
    });
    const legend = el('div', { style: 'display:flex; flex-wrap:wrap; gap:1rem; font-size:.8rem; color:var(--fg-muted); margin-top:.4rem;' });
    [['var(--accent)', 'chosen（被选）'], ['var(--accent-2)', 'rejected（被拒）']].forEach(([c, t]) => {
      legend.appendChild(el('span', {}, [el('span', { style: 'display:inline-block; width:.9em; height:.9em; border-radius:3px; background:' + c + '; margin-right:.35em; vertical-align:-.1em;' }), el('span', { text: t })]));
    });
    legend.appendChild(el('span', { text: '┄ 收敛目标：该对平均值 ± (q_c − q_r)/2（点击任一对看内容）' }));
    const barPanel = el('div', { class: 'widget-panel' }, [bars, legend]);

    // ---- 平均损失曲线 ----
    const LH = 130, LP = { l: 46, r: 14, t: 12, b: 26 }, L_MAX = 0.75;
    const ly = (v) => LP.t + (1 - clamp(v, 0, L_MAX) / L_MAX) * (LH - LP.t - LP.b);
    const loss = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + LH, style: 'width:100%; height:auto; display:block;' });
    [0, 0.25, 0.5, 0.75].forEach((v) => {
      loss.appendChild(svgEl('line', { x1: LP.l, y1: ly(v), x2: W - LP.r, y2: ly(v), stroke: 'var(--border)' }));
      loss.appendChild(svgText({ x: LP.l - 7, y: ly(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--fg-muted)' }, v));
    });
    loss.appendChild(svgEl('line', { x1: LP.l, y1: ly(FLOOR), x2: W - LP.r, y2: ly(FLOOR), stroke: 'var(--accent-2)', 'stroke-dasharray': '5 4' }));
    loss.appendChild(svgText({ x: W - LP.r - 4, y: ly(FLOOR) - 5, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--accent-2)' }, '噪声下限 ' + fmt(FLOOR, 2) + '（p* < 1 造成）'));
    loss.appendChild(svgText({ x: (LP.l + W - LP.r) / 2, y: LH - 3, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--fg-muted)' }, '训练步数 → 平均损失'));
    const lossPath = svgEl('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }); loss.appendChild(lossPath);
    const lossPanel = el('div', { class: 'widget-panel' }, [loss]);

    const detail = el('div', { class: 'widget-panel', style: 'font-size:.9rem; line-height:1.7;' });
    const interp = el('div', { class: 'widget-panel', style: 'font-size:.92rem; line-height:1.7;' });

    function trainStep() {
      PAIRS.forEach((p, i) => {
        const g = p.pstar - sigmoid(st.rc[i] - st.rr[i]);
        st.rc[i] += LR * g; st.rr[i] -= LR * g;
      });
      st.step++; st.note = ''; history.push(avgLoss());
    }
    btnStep.addEventListener('click', () => { if (!st.timer) { trainStep(); update(); } });
    btnAuto.addEventListener('click', () => {
      if (st.timer) return;
      let n = 0;
      btnStep.disabled = btnAuto.disabled = true;
      st.timer = setInterval(() => {
        trainStep(); update();
        if (++n >= AUTO_STEPS) { clearInterval(st.timer); st.timer = null; btnStep.disabled = btnAuto.disabled = false; update(); }
      }, 55);
    });
    btnShift.addEventListener('click', () => {
      PAIRS.forEach((_, i) => { st.rc[i] += 1; st.rr[i] += 1; });
      st.note = '刚才把 12 个分数全部 +1：所有分差 Δ 不变，偏好概率与损失也「完全不变」——BT 奖励没有绝对零点，只有差值有意义。';
      update();
    });
    btnReset.addEventListener('click', () => {
      if (st.timer) { clearInterval(st.timer); st.timer = null; btnStep.disabled = btnAuto.disabled = false; }
      PAIRS.forEach((_, i) => { st.rc[i] = 0; st.rr[i] = 0; });
      st.step = 0; st.note = ''; history.length = 0; history.push(avgLoss());
      update();
    });

    function update() {
      const L = avgLoss();
      stStep.v.textContent = st.step; stLoss.v.textContent = fmt(L);
      PAIRS.forEach((p, i) => {
        const z = by(0), yc = by(st.rc[i]), yr = by(st.rr[i]);
        refs[i].bc.setAttribute('y', Math.min(yc, z)); refs[i].bc.setAttribute('height', Math.max(Math.abs(yc - z), 1));
        refs[i].br.setAttribute('y', Math.min(yr, z)); refs[i].br.setAttribute('height', Math.max(Math.abs(yr - z), 1));
        const mean = (st.rc[i] + st.rr[i]) / 2;
        refs[i].tc.setAttribute('y1', by(mean + p.gap / 2)); refs[i].tc.setAttribute('y2', by(mean + p.gap / 2));
        refs[i].tr.setAttribute('y1', by(mean - p.gap / 2)); refs[i].tr.setAttribute('y2', by(mean - p.gap / 2));
        refs[i].selRect.setAttribute('opacity', st.sel === i ? 0.6 : 0);
      });
      const span = Math.max(history.length - 1, AUTO_STEPS);
      lossPath.setAttribute('d', history.map((v, i) =>
        (i ? 'L' : 'M') + (LP.l + (i / span) * (W - LP.l - LP.r)).toFixed(1) + ',' + ly(v).toFixed(1)).join(' '));
      const p = PAIRS[st.sel], i = st.sel, dz = st.rc[i] - st.rr[i];
      detail.innerHTML = '<strong>第 ' + (i + 1) + ' 对</strong>｜提示：「' + p.q + '」<br>' +
        '<span style="color:var(--accent);">chosen（r = ' + fmt(st.rc[i], 2) + '）：</span>' + p.c + '<br>' +
        '<span style="color:var(--accent-2);">rejected（r = ' + fmt(st.rr[i], 2) + '）：</span>' + p.r + '<br>' +
        '<span style="color:var(--fg-muted);">隐藏质量差 q_c − q_r = ' + fmt(p.gap, 1) + ' → 标注一致率 p* = ' + fmt(p.pstar, 3) +
        '；目前学到 Δ = ' + fmt(dz, 2) + '（收敛时 Δ → ' + fmt(p.gap, 1) + '），该对损失 = ' + fmt(pairLoss(i)) + '。</span>';
      let msg;
      if (st.step === 0) msg = '尚未训练：12 个 reward 全为 0，每一对的 P 都是 0.5，平均损失 = log 2 ≈ 0.693。按「训练一步」看看解析梯度怎么推动分数。';
      else if (L - FLOOR < 0.02) msg = '已贴近噪声下限（虚线）：损失降不下去了，因为偏好标注本身就不一致（p* < 1）。此时每一对学到的分差 Δ ≈ 真实质量差 q_c − q_r，但「绝对分数」停在任意位置——每一对的平均值从训练开始就没动过。';
      else if (L - FLOOR < 0.1) msg = '接近收敛：质量差大的对（如第 1 对，p* ≈ 0.98）分差拉得又快又开；质量差小的对（如第 4 对，p* ≈ 0.62）梯度早早变小、分差维持小——BT 损失自动把「标注有多一致」转译成「分差该多大」。';
      else msg = '训练中（第 ' + st.step + ' 步）：每一步 chosen 上升、rejected 等量下降，两者的平均恒为 0——梯度 η(p* − σ(Δ)) 只作用在「差值」上，模型从头到尾学的都是相对排序。';
      interp.innerHTML = '<strong>解读：</strong>' + msg +
        (st.note ? '<br><strong>平移实验：</strong>' + st.note : '') +
        '<br><strong>教学重点：</strong>奖励分数是从成对比较中「涌现」的相对量：对每个分数加同一常数 c，σ(Δ) 与损失完全不变（式 13）——所以单一分数没有绝对意义，跨模型、甚至跨提示的分数都不能直接比大小。';
    }
    update();
    return el('div', { style: 'display:flex; flex-direction:column; gap:1rem;' }, [eqPanel, controls, barPanel, lossPanel, detail, interp]);
  }

  // ================= 组件本体（分页签） =================
  window.ChapterWidget = {
    title: 'Bradley-Terry 奖励模型探索器',
    intro: '分页 1：拖动被选／被拒回复的分数，看 sigmoid 如何把分差变成偏好概率与 NLL 损失；分页 2：在 6 笔繁中偏好对上用解析梯度实际训练 12 个标量 reward，观察分数如何从比较中「涌现」。',
    render(root) {
      const panels = [buildTab1(), buildTab2()];
      const tabBtns = ['1｜偏好概率', '2｜训练奖励模型'].map((t, i) => {
        const b = el('button', { type: 'button', text: t, 'aria-selected': 'false' });
        b.addEventListener('click', () => setTab(i));
        return b;
      });
      function setTab(i) {
        panels.forEach((p, j) => { p.style.display = j === i ? '' : 'none'; });
        tabBtns.forEach((b, j) => {
          b.setAttribute('aria-selected', j === i ? 'true' : 'false');
          b.style.cssText = j === i
            ? 'background:var(--accent-soft); color:var(--accent); font-weight:700; border-color:var(--accent);'
            : 'color:var(--fg-muted);';
        });
      }
      root.appendChild(el('div', { style: 'display:flex; flex-direction:column; gap:1rem;' }, [
        el('div', { style: 'display:flex; gap:.5rem; flex-wrap:wrap;', role: 'tablist' }, tabBtns),
        panels[0], panels[1],
      ]));
      setTab(0);
    },
  };
})();
