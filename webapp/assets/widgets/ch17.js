/* 第 17 章互动组件：Persona 向量调音台（玩具模型） */
(function () {
  'use strict';

  var CSS = [
    '.c17-wrap{display:flex;flex-direction:column;gap:.8rem;font-size:.9rem;}',
    '.c17-axis{display:flex;flex-direction:column;gap:.3rem;padding:.55rem .2rem;}',
    '.c17-axis+.c17-axis{border-top:1px dashed var(--border);}',
    '.c17-axhead{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem;}',
    '.c17-part{font-size:.68rem;font-weight:700;letter-spacing:.05em;padding:.08rem .5rem;',
    '  border-radius:999px;border:1px solid currentColor;}',
    '.c17-alpha{margin-left:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
    '  font-size:.78rem;color:var(--fg-muted);}',
    '.c17-alpha b{color:var(--fg);font-weight:700;}',
    '.c17-track{display:flex;align-items:center;gap:.6rem;}',
    '.c17-track input[type=range]{flex:1 1 auto;min-width:0;}',
    '.c17-pole{flex:0 0 auto;font-size:.78rem;color:var(--fg-muted);white-space:nowrap;}',
    '.c17-pole.c17-on{color:var(--fg);font-weight:700;}',
    '.c17-formula{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;',
    '  border-top:1px solid var(--border);padding-top:.6rem;margin-top:.2rem;}',
    '.c17-formula .c17-flabel{font-size:.78rem;color:var(--fg-muted);}',
    '.c17-ktx{overflow-x:auto;max-width:100%;padding:.15rem 0;}',
    '.c17-chat{display:flex;flex-direction:column;gap:.6rem;}',
    '.c17-bubble{max-width:92%;border:1px solid var(--border);border-radius:12px;',
    '  padding:.6rem .8rem;line-height:1.75;}',
    '.c17-user{align-self:flex-end;background:var(--accent-soft);border-color:var(--accent);}',
    '.c17-asst{align-self:flex-start;background:var(--panel-2);width:92%;}',
    '.c17-who{display:block;font-size:.68rem;font-weight:700;letter-spacing:.08em;',
    '  color:var(--fg-muted);margin-bottom:.3rem;}',
    '.c17-seg{margin:.45rem 0 0;padding-left:.65rem;border-left:3px solid var(--border);',
    '  animation:c17in .35s ease;}',
    '.c17-seg:first-of-type{margin-top:0;}',
    '@keyframes c17in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}',
    '.c17-tag{display:block;font-size:.68rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
    '  margin-bottom:.15rem;}',
    '.c17-warn{border:1px solid var(--accent-2);border-left-width:4px;border-radius:8px;',
    '  background:var(--panel);padding:.6rem .8rem;line-height:1.7;font-size:.85rem;',
    '  animation:c17in .35s ease;}',
    '.c17-warn b{color:var(--accent-2);}',
    '.c17-note{border-left:3px solid var(--accent);background:var(--accent-soft);',
    '  border-radius:0 8px 8px 0;padding:.6rem .8rem;font-size:.85rem;line-height:1.7;',
    '  color:var(--fg);}'
  ].join('\n');

  var USER_MSG = '我这周工作压力好大，该怎么办？';
  var AXIS_COLOR = ['var(--accent)', 'var(--link)', 'var(--accent-2)'];

  /* 三个玩具 persona 向量：索引 0～4 对应 α = −2～+2，正 α 放大「pos」极的特质 */
  var AXES = [
    {
      neg: '正式', pos: '亲暱', part: '开场语', tex: '\\mathbf{v}_{\\text{亲暱}}',
      levels: ['非常正式', '稍偏正式', '中性（默认）', '稍偏亲暱', '非常亲暱'],
      frags: [
        '您好。关于您提及的工作压力状况，以下提供几点方向，供您参考。',
        '您好，连续一周处于高压状态，确实值得正视。这里整理了几个可行的做法。',
        '连续高压一整周真的很消耗。我们可以从几个方向着手。',
        '辛苦了，这周听起来真的不容易。先深呼吸一口气，我们一起来想办法。',
        '欸，先给你一个大大的拥抱。高压撑过整整一周还愿意开口，这本身就很了不起——剩下的，我们一起慢慢拆。'
      ]
    },
    {
      neg: '简洁', pos: '详尽', part: '主体建议', tex: '\\mathbf{v}_{\\text{详尽}}',
      levels: ['极度简洁', '偏简洁', '适中（默认）', '偏详尽', '非常详尽'],
      frags: [
        '三件事：把压力源全部写下来、砍掉或延后不紧急的、每天留十五分钟完全离线。',
        '先做两件事：把这周所有待办写下来，标出真正紧急的两三件，其余能延就延；然后每天固定留一小段完全不碰工作的时间，让脑袋有机会关机。',
        '可以先把让你紧绷的事情全部列出来，分成『我能控制』和『我控制不了』两类：能控制的，挑影响最大的一件先动手；控制不了的，练习暂时放下。另外，睡眠和短暂的运动对缓解压力很有效——哪怕只是下班后散步十分钟，也能帮大脑切换状态。',
        '我们可以分三步拆解。第一步，把这周所有让你紧绷的事逐条写下来——『写下来』这个动作本身就能减轻大脑反复咀嚼的负荷。第二步，把清单分成『我能控制』和『我控制不了』：能控制的，挑影响最大的一件切成小步骤先动手；控制不了的，允许自己暂时放下。第三步，守住身体的基本盘——固定的睡眠时间、每天十到二十分钟的散步或伸展，对压力的缓解远比想像中实在。',
        '我们可以分几个层次来拆解。首先是厘清压力源：把这周所有让你紧绷的事逐条写下来——『外化』这个动作本身，就能明显降低大脑反复咀嚼的负荷。接着分类：哪些是你能控制的（例如报告的范围），哪些不是（例如主管的情绪）？能控制的，挑影响最大的一件，切成三十分钟内能完成的小步骤，先做第一步就好；控制不了的，允许自己暂时放下，因为反复担忧并不会改变结果。再来是身体的基本盘：高压时最容易被牺牲的睡眠与运动，恰恰是恢复力的来源——每天十到二十分钟的快走、固定的上床时间，都会实质改变压力的曲线。最后，如果这样的负荷已经持续好几周而不只是这一周，也许值得跟主管谈谈工作量的分配，或考虑寻求专业协助。'
      ]
    },
    {
      neg: '直接建议', pos: '同理倾听', part: '结尾语', tex: '\\mathbf{v}_{\\text{同理}}',
      levels: ['非常直接', '偏直接', '平衡（默认）', '偏同理', '完全同理倾听'],
      frags: [
        '别想太多，现在就挑一件开始做。今晚睡前把明天最重要的一件事定下来，其他先搁着——行动比完美的计划重要。',
        '建议今天就从第一步开始，哪怕只做十分钟；开始行动本身，往往就是降低焦虑最快的方法。',
        '可以先从其中一项试起，观察几天；如果情况没有改善，我们再一起调整做法。',
        '不过，方法先放一边也没关系。比起马上行动，也许你更需要先被听见——愿意说说这周是哪件事让你最喘不过气吗？',
        '其实，你现在不需要急着解决任何事。压力大到愿意说出口，本身就已经是在照顾自己了。我在这里，你想从哪里说起都可以，慢慢来。'
      ]
    }
  ];

  var WARN_TEXT = '三个 persona 向量的系数都被推到 |α| = 2 的极端。在真实模型中，' +
    '把残差流激活值沿多个方向推得太远，会让模型离开它正常运作的分布——输出开始不自然、' +
    '一般能力下降（研究显示效果可能呈 U 形曲线，17.1.1）。这正是 17.1.2 节' +
    '「激活值封顶（activation capping）」的动机：把偏离过远的激活值拉回安全范围，' +
    '在控制 persona 的同时保住能力。';

  var NOTE_TEXT = '玩具模型说明：真实系统中，v 是用对比激活分析，从「表现该特质 vs. 不表现该特质」' +
    '两组回应的激活值差抽取出的残差流方向（本章 17.1.1），并在每个词元生成步骤施加 h ← h + αv；' +
    '这里以预先撰写的文字片段模拟其效果。三个滑杆各对应一个近似正交的方向，' +
    '组合方式正如复合向量 v_composite = Σ αᵢ·vᵢ——同一组权重，部署后即可调出不同个性。';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtAlpha(v) {
    return v > 0 ? '+' + v : (v < 0 ? '−' + Math.abs(v) : '0');
  }

  function render(rootEl) {
    if (!document.getElementById('c17-style')) {
      var st = el('style');
      st.id = 'c17-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var wrap = el('div', 'c17-wrap');
    var vals = [0, 0, 0]; /* 三轴目前的 α */

    /* ── 调音台面板 ── */
    var mixer = el('div', 'widget-panel');
    var rows = AXES.map(function (ax, i) {
      var axis = el('div', 'c17-axis');
      var head = el('div', 'c17-axhead');
      var part = el('span', 'c17-part', ax.part);
      part.style.color = AXIS_COLOR[i];
      var alpha = el('span', 'c17-alpha');
      head.appendChild(part);
      head.appendChild(el('span', null, ax.neg + ' ↔ ' + ax.pos));
      head.appendChild(alpha);

      var track = el('div', 'c17-track');
      var lp = el('span', 'c17-pole', ax.neg);
      var rp = el('span', 'c17-pole', ax.pos);
      var slider = el('input');
      slider.type = 'range';
      slider.min = '-2'; slider.max = '2'; slider.step = '1'; slider.value = '0';
      slider.setAttribute('aria-label', ax.part + '：' + ax.neg + '到' + ax.pos);
      track.appendChild(lp); track.appendChild(slider); track.appendChild(rp);

      axis.appendChild(head); axis.appendChild(track);
      mixer.appendChild(axis);

      slider.addEventListener('input', function () {
        vals[i] = Number(slider.value);
        update();
      });
      return { slider: slider, alpha: alpha, lp: lp, rp: rp };
    });

    /* 引导公式 + 控制按钮 */
    var frow = el('div', 'c17-formula');
    frow.appendChild(el('span', 'c17-flabel', '目前的激活值引导：'));
    var ktx = el('span', 'c17-ktx');
    frow.appendChild(ktx);
    mixer.appendChild(frow);

    var btns = el('div', 'widget-row');
    var btnRandom = el('button', null, '随机 persona');
    var btnReset = el('button', null, '重设为默认助理');
    btns.appendChild(btnRandom); btns.appendChild(btnReset);

    /* ── 对话面板 ── */
    var chat = el('div', 'widget-panel c17-chat');
    var ub = el('div', 'c17-bubble c17-user');
    ub.appendChild(el('span', 'c17-who', '用户'));
    ub.appendChild(el('span', null, USER_MSG));
    var ab = el('div', 'c17-bubble c17-asst');
    var who = el('span', 'c17-who', '助理（沿 persona 向量引导后）');
    ab.appendChild(who);
    var segsBox = el('div');
    ab.appendChild(segsBox);
    chat.appendChild(ub); chat.appendChild(ab);

    var warn = el('div', 'c17-warn');
    warn.appendChild(el('b', null, '⚠ 过度引导警示：'));
    warn.appendChild(el('span', null, WARN_TEXT));
    warn.hidden = true;

    var note = el('div', 'c17-note', NOTE_TEXT);

    wrap.appendChild(mixer); wrap.appendChild(btns);
    wrap.appendChild(chat); wrap.appendChild(warn); wrap.appendChild(note);
    rootEl.appendChild(wrap);

    function renderFormula() {
      var tex = '\\mathbf{h}\\;\\leftarrow\\;\\mathbf{h}';
      var plain = 'h ← h';
      AXES.forEach(function (ax, i) {
        var a = vals[i];
        tex += (a < 0 ? ' - ' : ' + ') + Math.abs(a) + '\\,' + ax.tex;
        plain += (a < 0 ? ' − ' : ' + ') + Math.abs(a) + '·v(' + ax.pos + ')';
      });
      if (window.katex) {
        window.katex.render(tex, ktx, { throwOnError: false });
      } else {
        ktx.textContent = plain;
      }
    }

    function update() {
      rows.forEach(function (r, i) {
        var a = vals[i];
        r.slider.value = String(a);
        r.alpha.innerHTML = '';
        r.alpha.appendChild(el('span', null, 'α = '));
        r.alpha.appendChild(el('b', null, fmtAlpha(a)));
        r.alpha.appendChild(el('span', null, '（' + AXES[i].levels[a + 2] + '）'));
        r.lp.classList.toggle('c17-on', a < 0);
        r.rp.classList.toggle('c17-on', a > 0);
      });

      segsBox.innerHTML = '';
      AXES.forEach(function (ax, i) {
        var seg = el('p', 'c17-seg');
        seg.style.borderLeftColor = AXIS_COLOR[i];
        var tag = el('span', 'c17-tag',
          ax.part + '｜' + ax.neg + '↔' + ax.pos + '　α = ' + fmtAlpha(vals[i]));
        tag.style.color = AXIS_COLOR[i];
        seg.appendChild(tag);
        seg.appendChild(el('span', null, ax.frags[vals[i] + 2]));
        segsBox.appendChild(seg);
      });

      warn.hidden = !(Math.abs(vals[0]) === 2 && Math.abs(vals[1]) === 2 && Math.abs(vals[2]) === 2);
      renderFormula();
    }

    btnReset.addEventListener('click', function () {
      vals = [0, 0, 0];
      update();
    });

    btnRandom.addEventListener('click', function () {
      var next;
      do {
        next = vals.map(function () { return Math.floor(Math.random() * 5) - 2; });
      } while (next[0] === vals[0] && next[1] === vals[1] && next[2] === vals[2]);
      vals = next;
      update();
    });

    update();
  }

  window.ChapterWidget = {
    title: 'Persona 向量调音台（玩具模型）',
    intro: '把三个近似正交的 persona 向量——正式↔亲暱、简洁↔详尽、直接建议↔同理倾听——' +
      '当成滑杆来推。每个系数 α 决定沿该方向引导的强度（α > 0 放大、α < 0 抑制），' +
      '对同一句「工作压力好大」的回复风格随之连续变化，体感 17.1.1 节 h ← h + αv ' +
      '的激活值引导，以及复合向量如何在不重新训练的情况下组合出完整的个性轮廓。',
    render: render
  };
})();
