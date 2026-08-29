/* 第 15 章互动组件：KL 散度探索器（前向 vs 反向） */
(function () {
  'use strict';

  var CSS = [
    '.c15-wrap{display:flex;flex-direction:column;gap:.8rem;font-size:.9rem;}',
    '.c15-klrow{display:flex;gap:.8rem;flex-wrap:wrap;}',
    '.c15-klcard{flex:1 1 240px;min-width:0;display:flex;flex-direction:column;gap:.25rem;',
    '  transition:border-color .25s;}',
    '.c15-klhead{font-size:.78rem;font-weight:700;letter-spacing:.04em;color:var(--fg-muted);}',
    '.c15-fx{min-height:1.7rem;overflow-x:auto;overflow-y:hidden;font-size:.86rem;color:var(--fg);}',
    '.c15-val{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:1.3rem;',
    '  font-weight:700;color:var(--fg);transition:color .25s;}',
    '.c15-val small{font-size:.7rem;font-weight:400;color:var(--fg-muted);margin-left:.25rem;}',
    '.c15-klcard.c15-hot{border-color:var(--accent-2);}',
    '.c15-klcard.c15-hot .c15-val{color:var(--accent-2);}',
    '.c15-tag{font-size:.74rem;color:var(--fg-muted);line-height:1.5;}',
    '.c15-svgbox{padding:.4rem .4rem .1rem;}',
    '.c15-svg{width:100%;height:auto;display:block;}',
    '.c15-ctl{display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;align-items:center;}',
    '.c15-sl{flex:1 1 230px;min-width:210px;display:flex;align-items:center;gap:.5rem;}',
    '.c15-sl input[type=range]{flex:1;min-width:100px;}',
    '.c15-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8rem;',
    '  color:var(--fg);min-width:76px;}',
    '.c15-note{font-size:.85rem;line-height:1.75;color:var(--fg);}',
    '.c15-note b{color:var(--accent);}',
    '.c15-note .c15-lead{font-weight:700;color:var(--fg-muted);font-size:.76rem;',
    '  letter-spacing:.08em;display:block;margin-bottom:.15rem;}'
  ].join('\n');

  /* ---- 数值核心：固定网格上的密度与 KL 积分 ---- */
  var XMIN = -7, XMAX = 7, DX = 0.02, NPTS = Math.round((XMAX - XMIN) / DX) + 1;
  var GRID = new Array(NPTS);
  for (var gi = 0; gi < NPTS; gi++) GRID[gi] = XMIN + gi * DX;
  var MU_MIN = -5, MU_MAX = 5, SIG_MIN = 0.2, SIG_MAX = 3.0;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function gaussArr(mu, sig) {
    var a = new Array(NPTS), c = 1 / (sig * Math.sqrt(2 * Math.PI));
    for (var i = 0; i < NPTS; i++) {
      var z = (GRID[i] - mu) / sig;
      a[i] = c * Math.exp(-0.5 * z * z);
    }
    return a;
  }
  function normalize(a) {
    var s = 0, i;
    for (i = 0; i < NPTS; i++) s += a[i];
    s *= DX;
    for (i = 0; i < NPTS; i++) a[i] /= s;
    return a;
  }
  /* KL(p‖q) = Σ p·log(p/q)·Δx，离散黎曼和 */
  function klOf(p, q) {
    var s = 0;
    for (var i = 0; i < NPTS; i++) {
      if (p[i] > 1e-12) s += p[i] * Math.log(p[i] / Math.max(q[i], 1e-12));
    }
    return Math.max(0, s * DX);
  }
  /* 参考模型 π_ref：双峰＝0.7·N(−3,0.5²)＋0.3·N(3,0.7²)；单峰＝N(0,1) */
  function makeRef(bimodal) {
    if (!bimodal) return normalize(gaussArr(0, 1));
    var a = gaussArr(-3, 0.5), b = gaussArr(3, 0.7);
    for (var i = 0; i < NPTS; i++) a[i] = 0.7 * a[i] + 0.3 * b[i];
    return normalize(a);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function tex(node, src, fallback) {
    if (window.katex) window.katex.render(src, node, { throwOnError: false });
    else node.textContent = fallback;
  }
  function svgEl(name, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---- 绘图座标（画 |x|≤6 的范围） ---- */
  var W = 720, H = 280, PL = 36, PR = 14, PT = 20, PB = 32, PXMIN = -6, PXMAX = 6;
  function xPx(x) { return PL + (x - PXMIN) / (PXMAX - PXMIN) * (W - PL - PR); }
  function yPx(d, ymax) { return PT + (1 - d / ymax) * (H - PT - PB); }
  function densPath(dens, ymax, closed) {
    var d = '', i, x;
    for (i = 0; i < NPTS; i += 2) {
      x = GRID[i];
      if (x < PXMIN || x > PXMAX) continue;
      d += (d ? 'L' : 'M') + xPx(x).toFixed(1) + ' ' + yPx(dens[i], ymax).toFixed(1);
    }
    if (closed) d += 'L' + xPx(PXMAX) + ' ' + yPx(0, ymax) + 'L' + xPx(PXMIN) + ' ' + yPx(0, ymax) + 'Z';
    return d;
  }

  function render(rootEl) {
    if (!document.getElementById('c15-style')) {
      var st = el('style'); st.id = 'c15-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var state = { mu: 0, sigma: 1, bimodal: true };
    var refDens = makeRef(true);
    var timer = null, lastDone = '';

    var wrap = el('div', 'c15-wrap');

    /* KL 数值卡（含 KaTeX 定义式） */
    function klCard(headTxt, texSrc, fbTxt, tagTxt) {
      var card = el('div', 'widget-panel c15-klcard');
      card.appendChild(el('div', 'c15-klhead', headTxt));
      var fx = el('div', 'c15-fx'); tex(fx, texSrc, fbTxt); card.appendChild(fx);
      var val = el('div', 'c15-val', '—');
      val.appendChild(el('small', null, 'nats'));
      card.appendChild(val);
      card.appendChild(el('div', 'c15-tag', tagTxt));
      return { card: card, val: val };
    }
    var klrow = el('div', 'c15-klrow');
    var fwdCard = klCard('前向 KL｜SFT ≈ 模式涵盖（mass-covering）',
      '\\mathrm{KL}(\\pi_{\\mathrm{ref}}\\,\\|\\,\\pi_\\theta)=\\mathbb{E}_{y\\sim\\pi_{\\mathrm{ref}}}\\!\\left[\\log\\pi_{\\mathrm{ref}}(y)-\\log\\pi_\\theta(y)\\right]',
      'KL(π_ref‖π_θ) = E_{y~π_ref}[log π_ref(y) − log π_θ(y)]',
      '从目标 π_ref 采样：π_θ 漏掉 π_ref 的任何一峰都会被重罚。');
    var revCard = klCard('反向 KL｜RL ≈ 模式寻求（mode-seeking）',
      '\\mathrm{KL}(\\pi_\\theta\\,\\|\\,\\pi_{\\mathrm{ref}})=\\mathbb{E}_{y\\sim\\pi_\\theta}\\!\\left[\\log\\pi_\\theta(y)-\\log\\pi_{\\mathrm{ref}}(y)\\right]',
      'KL(π_θ‖π_ref) = E_{y~π_θ}[log π_θ(y) − log π_ref(y)]',
      '从自己 π_θ 采样：只有把质量放到 π_ref 几乎为零的地方才会被重罚。');
    klrow.appendChild(fwdCard.card); klrow.appendChild(revCard.card);

    /* SVG 图 */
    var svgPanel = el('div', 'widget-panel c15-svgbox');
    var svg = svgEl('svg', { 'class': 'c15-svg', viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': '参考模型与目前策略的概率密度曲线' });
    var axis = svgEl('g', {});
    axis.appendChild(svgEl('line', { x1: PL, y1: H - PB, x2: W - PR, y2: H - PB,
      stroke: 'var(--border)', 'stroke-width': 1 }));
    for (var t = PXMIN; t <= PXMAX; t += 2) {
      axis.appendChild(svgEl('line', { x1: xPx(t), y1: H - PB, x2: xPx(t), y2: H - PB + 4,
        stroke: 'var(--border)' }));
      var lb = svgEl('text', { x: xPx(t), y: H - PB + 17, 'text-anchor': 'middle',
        'font-size': 11, fill: 'var(--fg-muted)' });
      lb.textContent = String(t); axis.appendChild(lb);
    }
    var refPath = svgEl('path', { fill: 'var(--fg-muted)', 'fill-opacity': 0.16,
      stroke: 'var(--fg-muted)', 'stroke-width': 1.5 });
    var piPath = svgEl('path', { fill: 'var(--accent)', 'fill-opacity': 0.12,
      stroke: 'var(--accent)', 'stroke-width': 2.2 });
    var muLine = svgEl('line', { stroke: 'var(--accent)', 'stroke-dasharray': '4 4',
      'stroke-width': 1, opacity: 0.65 });
    var modeLbls = svgEl('g', { 'font-size': 11.5, fill: 'var(--fg-muted)', 'text-anchor': 'middle' });
    var oldLbl = svgEl('text', {}); oldLbl.textContent = '「旧」模式（先验知识）';
    var newLbl = svgEl('text', {}); newLbl.textContent = '「新」模式（目标任务）';
    modeLbls.appendChild(oldLbl); modeLbls.appendChild(newLbl);
    var legend = svgEl('g', { 'font-size': 12 });
    legend.appendChild(svgEl('rect', { x: W - 190, y: 8, width: 14, height: 10,
      fill: 'var(--fg-muted)', 'fill-opacity': 0.4 }));
    var lg1 = svgEl('text', { x: W - 172, y: 17.5, fill: 'var(--fg-muted)' });
    lg1.textContent = 'π_ref 参考模型'; legend.appendChild(lg1);
    legend.appendChild(svgEl('rect', { x: W - 190, y: 26, width: 14, height: 10,
      fill: 'var(--accent)', 'fill-opacity': 0.5 }));
    var lg2 = svgEl('text', { x: W - 172, y: 35.5, fill: 'var(--accent)' });
    lg2.textContent = 'π_θ 目前策略'; legend.appendChild(lg2);
    svg.appendChild(axis); svg.appendChild(refPath); svg.appendChild(piPath);
    svg.appendChild(muLine); svg.appendChild(modeLbls); svg.appendChild(legend);
    svgPanel.appendChild(svg);

    /* 控制列：π_ref 形状 + μ、σ 滑杆 */
    function slider(min, max, step, val) {
      var s = el('input'); s.type = 'range';
      s.min = String(min); s.max = String(max); s.step = String(step); s.value = String(val);
      return s;
    }
    var ctl = el('div', 'c15-ctl');
    var sel = el('select');
    var op1 = el('option', null, 'π_ref：双峰（旧模式＋新模式）'); op1.value = 'bi';
    var op2 = el('option', null, 'π_ref：单峰 N(0,1)'); op2.value = 'uni';
    sel.appendChild(op1); sel.appendChild(op2);
    var muSl = slider(MU_MIN, MU_MAX, 0.05, state.mu);
    var sigSl = slider(SIG_MIN, SIG_MAX, 0.02, state.sigma);
    var muLbl = el('span', 'c15-mono'), sigLbl = el('span', 'c15-mono');
    var slMu = el('div', 'c15-sl'); slMu.appendChild(muLbl); slMu.appendChild(muSl);
    var slSig = el('div', 'c15-sl'); slSig.appendChild(sigLbl); slSig.appendChild(sigSl);
    ctl.appendChild(sel); ctl.appendChild(slMu); ctl.appendChild(slSig);

    /* 按钮列 */
    var btnRow = el('div', 'widget-row');
    var btnFwd = el('button', null, '▶ 最小化前向 KL（SFT）');
    var btnRev = el('button', null, '▶ 最小化反向 KL（RL）');
    var btnReset = el('button', null, '重设');
    btnRow.appendChild(btnFwd); btnRow.appendChild(btnRev); btnRow.appendChild(btnReset);

    /* 解读面板 */
    var note = el('div', 'widget-panel c15-note');
    var noteLead = el('span', 'c15-lead', '解读');
    var noteBody = el('span');
    note.appendChild(noteLead); note.appendChild(noteBody);

    wrap.appendChild(klrow); wrap.appendChild(svgPanel);
    wrap.appendChild(ctl); wrap.appendChild(btnRow); wrap.appendChild(note);
    rootEl.appendChild(wrap);

    /* ---- 目标函数与梯度下降（数值微分） ---- */
    function objective(mu, logSig, dir) {
      var q = normalize(gaussArr(mu, Math.exp(logSig)));
      return dir === 'fwd' ? klOf(refDens, q) : klOf(q, refDens);
    }
    function gdStep(dir) {
      var h = 1e-3, ls = Math.log(state.sigma);
      var gMu = clamp((objective(state.mu + h, ls, dir) - objective(state.mu - h, ls, dir)) / (2 * h), -4, 4);
      var gLs = clamp((objective(state.mu, ls + h, dir) - objective(state.mu, ls - h, dir)) / (2 * h), -4, 4);
      state.mu = clamp(state.mu - 0.5 * gMu, MU_MIN, MU_MAX);
      state.sigma = Math.exp(clamp(ls - 0.25 * gLs, Math.log(SIG_MIN), Math.log(SIG_MAX)));
    }

    function interpret(klF, klR) {
      var mu = state.mu, sg = state.sigma;
      var prefix = lastDone === 'fwd' ? '梯度下降完成（前向 KL）。' :
                   lastDone === 'rev' ? '梯度下降完成（反向 KL）。' : '';
      if (!state.bimodal) {
        if (Math.abs(mu) < 0.5 && Math.abs(sg - 1) < 0.3)
          return prefix + 'π_θ 与单峰 π_ref 几乎重合，两个 KL 都趋近 0。单峰情境下前向与反向殊途同归——切回双峰，才能看到两个方向分道扬镳。';
        return prefix + '参考模型只有一个峰：不论最小化哪个方向的 KL，最优解都是同一个峰，差异只在收敛路径与 σ 错配时的惩罚不对称（σ 偏大时反向 KL 罚得更重）。';
      }
      var hugOld = Math.abs(mu + 3) < 0.7 && sg < 1.2;
      var hugNew = Math.abs(mu - 3) < 0.7 && sg < 1.2;
      if (hugOld || hugNew)
        return prefix + 'π_θ 贴住「' + (hugOld ? '旧' : '新') + '」模式（mode-seeking）：反向 KL 很低，前向 KL 却爆高——因为另一峰完全没被覆盖。这正是本章 15.2.2 的核心：RL 只在自己有质量的区域更新、不去拉扯另一峰；' +
          '反向 KL 的 mode-seeking 是「RL 遗忘较少」的关键直觉（RL’s Razor）：在众多高奖励解中，on-policy 方法天生偏向 KL 上离参考策略较近的解。';
      if (sg > 2.2 && mu > -2.6 && mu < 0.8)
        return prefix + 'π_θ 拉成一个涵盖两峰的宽分布（mass-covering／mean-seeking）：前向 KL 低，但大量质量落在两峰之间 π_ref 几乎为零的谷地，反向 KL 因此偏高。这对应 SFT：为了涵盖目标的所有模式而拉伸策略、从「旧」模式抽走概率质量——造成遗忘。';
      if (sg < 1.0 && Math.abs(mu) < 1.6)
        return prefix + 'π_θ 集中在两峰之间的低概率谷地：两个 KL 同时偏高——前向 KL 重罚「漏掉的峰」，反向 KL 重罚「放错地方的质量」。试着按两个按钮，看两种目标分别把它推向何方。';
      return prefix + (klF > klR
        ? '目前前向 KL 较大：π_ref 有可观质量的区域没被 π_θ 覆盖（SFT 目标会强拉 π_θ 去涵盖所有峰）。'
        : '目前反向 KL 较大：π_θ 把质量放在 π_ref 概率极低的区域（RL 的 KL 惩罚会把它推回参考分布附近）。');
    }

    function redraw(runningMsg) {
      var piDens = normalize(gaussArr(state.mu, state.sigma));
      var klF = klOf(refDens, piDens), klR = klOf(piDens, refDens);
      var ymax = 0, i;
      for (i = 0; i < NPTS; i++) {
        if (refDens[i] > ymax) ymax = refDens[i];
        if (piDens[i] > ymax) ymax = piDens[i];
      }
      ymax *= 1.1;
      refPath.setAttribute('d', densPath(refDens, ymax, true));
      piPath.setAttribute('d', densPath(piDens, ymax, true));
      var mx = xPx(clamp(state.mu, PXMIN, PXMAX));
      muLine.setAttribute('x1', mx); muLine.setAttribute('x2', mx);
      muLine.setAttribute('y1', PT); muLine.setAttribute('y2', H - PB);
      modeLbls.style.display = state.bimodal ? '' : 'none';
      if (state.bimodal) {
        oldLbl.setAttribute('x', xPx(-3)); oldLbl.setAttribute('y', 14);
        newLbl.setAttribute('x', xPx(3)); newLbl.setAttribute('y', 14);
      }
      fwdCard.val.childNodes[0].nodeValue = klF.toFixed(3);
      revCard.val.childNodes[0].nodeValue = klR.toFixed(3);
      var hot = Math.max(klF, klR) > 1.6 * Math.min(klF, klR) && Math.abs(klF - klR) > 0.2;
      fwdCard.card.classList.toggle('c15-hot', hot && klF > klR);
      revCard.card.classList.toggle('c15-hot', hot && klR > klF);
      muLbl.textContent = 'μ = ' + Number(state.mu).toFixed(2);
      sigLbl.textContent = 'σ = ' + Number(state.sigma).toFixed(2);
      muSl.value = String(state.mu); sigSl.value = String(state.sigma);
      noteBody.textContent = runningMsg || interpret(klF, klR);
    }

    function stopAnim() {
      if (timer) { clearInterval(timer); timer = null; }
      btnFwd.disabled = btnRev.disabled = false;
      muSl.disabled = sigSl.disabled = sel.disabled = false;
    }
    function optimize(dir) {
      stopAnim(); lastDone = '';
      btnFwd.disabled = btnRev.disabled = true;
      muSl.disabled = sigSl.disabled = sel.disabled = true;
      var frame = 0, FRAMES = 60;
      var name = dir === 'fwd' ? '前向 KL（SFT 视角）' : '反向 KL（RL 视角）';
      timer = setInterval(function () {
        frame++;
        gdStep(dir); gdStep(dir); /* 每格 2 步，共 120 步梯度下降 */
        if (frame >= FRAMES) {
          stopAnim(); lastDone = dir; redraw();
        } else {
          redraw('最小化' + name + ' 中…梯度下降第 ' + (frame * 2) + ' / ' + (FRAMES * 2) +
            ' 步：μ = ' + state.mu.toFixed(2) + '、σ = ' + state.sigma.toFixed(2));
        }
      }, 33);
    }

    muSl.addEventListener('input', function () {
      stopAnim(); lastDone = ''; state.mu = Number(muSl.value); redraw();
    });
    sigSl.addEventListener('input', function () {
      stopAnim(); lastDone = ''; state.sigma = Number(sigSl.value); redraw();
    });
    sel.addEventListener('change', function () {
      stopAnim(); lastDone = '';
      state.bimodal = sel.value === 'bi';
      refDens = makeRef(state.bimodal);
      redraw();
    });
    btnFwd.addEventListener('click', function () { optimize('fwd'); });
    btnRev.addEventListener('click', function () { optimize('rev'); });
    btnReset.addEventListener('click', function () {
      stopAnim(); lastDone = '';
      state.mu = 0; state.sigma = 1; state.bimodal = true;
      sel.value = 'bi'; refDens = makeRef(true);
      redraw();
    });

    redraw();
  }

  window.ChapterWidget = {
    title: 'KL 散度探索器：前向 vs 反向',
    intro: '拖动滑杆调整目前策略 π_θ（单峰高斯）的 μ 与 σ，观察它对双峰参考模型 π_ref 的前向与反向 KL' +
      '（固定网格数值积分）。按下两个最小化按钮跑梯度下降动画：前向 KL（SFT）收敛到涵盖两峰的宽分布' +
      '（mass-covering），反向 KL（RL）收敛到贴住单一峰（mode-seeking）——对应 15.2.2「SFT 记忆、' +
      'RL 遗忘较少」与 RL’s Razor 的核心直觉。',
    render: render
  };
})();
