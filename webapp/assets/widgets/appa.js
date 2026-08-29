/* 附录 A 互动组件：RLHF 词汇抽认卡 */
(function () {
  'use strict';

  var TERMS = [
    { zh: 'KL 散度', en: 'Kullback-Leibler Divergence', cat: 'ML',
      def: '衡量定义在同一概率空间上的两个概率分布 $P$ 与 $Q$ 之间差异的度量：$\\mathcal{D}_{\\mathrm{KL}}(P\\|Q)=\\sum_{x}P(x)\\log\\left(\\frac{P(x)}{Q(x)}\\right)$。' },
    { zh: '蒸馏', en: 'Distillation', cat: 'ML',
      def: '以较强模型的输出来训练另一个模型的通用做法，是一种已知能打造强大小型模型的合成数据类型。此词如今用法已超载，与机器学习文献中的特定技术定义有所出入。' },
    { zh: '（师生式）知识蒸馏', en: 'Knowledge Distillation', cat: 'ML',
      def: '蒸馏的特定型态，也是此术语的起源：透过修改损失函数，让学生模型 $P_\\theta$ 从教师模型 $P_\\phi$ 在多个潜在词元／对数概率上的分布中学习，而非直接学习单一选定的输出。' },
    { zh: '合成数据', en: 'Synthetic Data', cat: 'ML',
      def: '任何由另一个 AI 系统的输出所构成的训练数据，范围从模型针对开放式提示词生成的文字，到模型对既有内容的改写。' },
    { zh: '提示词', en: 'Prompt', cat: 'NLP',
      def: '提供给语言模型、用以生成回应或补全的输入文字，记作 $x$。' },
    { zh: '补全', en: 'Completion', cat: 'NLP',
      def: '语言模型针对某个提示词所生成的输出文字，常记作 $y \\mid x$；奖励值常以 $r(y \\mid x)$ 的形式计算。' },
    { zh: '被选补全', en: 'Chosen Completion', cat: 'NLP',
      def: '相较于其他候选项而被挑选或偏好的补全，记作 $y_c$，也常记作 $y_{chosen}$。' },
    { zh: '被拒补全', en: 'Rejected Completion', cat: 'NLP',
      def: '在成对比较（pairwise）情境中不受偏好的那个补全，记作 $y_r$。' },
    { zh: '偏好关系', en: 'Preference Relation', cat: 'NLP',
      def: '表示某一补全优于另一补全的符号，例如 $y_{chosen} \\succ y_{rejected}$；奖励模型会预测此关系成立的概率 $P(y_c \\succ y_r \\mid x)$。' },
    { zh: '思维链', en: 'Chain-of-Thought (CoT)', cat: 'NLP',
      def: '语言模型的一种特定行为，指模型被引导以逐步拆解问题的形式作答，最初的版本透过提示词「Let’s think step by step」实现。' },
    { zh: '情境内学习', en: 'In-context Learning (ICL)', cat: 'NLP',
      def: '利用语言模型上下文窗口内任何信息（通常是加到提示词中的内容）的学习方式；最简单的形式是在提示词前加入形式相似的范例。' },
    { zh: '策略', en: 'Policy', cat: 'RL',
      def: '以 $\\theta$ 为参数、定义在所有可能补全上的概率分布 $\\pi_\\theta(y \\mid x)$；在强化学习中是智能体决定动作的规则 $\\pi(a \\mid s)$，RLHF 中也称策略模型。' },
    { zh: '奖励', en: 'Reward', cat: 'RL',
      def: '表示某个动作或状态之可取程度（desirability）的标量值，通常记作 $r$。' },
    { zh: '优势函数', en: 'Advantage Function', cat: 'RL',
      def: '量化在状态 $s$ 下采取动作 $a$ 相较于平均动作的相对效益：$A(s,a)=Q(s,a)-V(s)$，可依附于特定策略记作 $A^\\pi(s,a)$。' },
    { zh: '价值函数', en: 'Value Function', cat: 'RL',
      def: '估计从给定状态出发的期望累积奖励的函数：$V(s)=\\mathbb{E}\\left[\\sum_{t=0}^{\\infty}\\gamma^t r_t \\mid s_0=s\\right]$。' },
    { zh: 'Q 函数', en: 'Q-Function', cat: 'RL',
      def: '估计在给定状态下采取特定动作后的期望累积奖励：$Q(s,a)=\\mathbb{E}\\left[\\sum_{t=0}^{\\infty}\\gamma^t r_t \\mid s_0=s, a_0=a\\right]$。' },
    { zh: '轨迹', en: 'Trajectory', cat: 'RL',
      def: '智能体所经历的一连串状态、动作与奖励：$\\tau=(s_0,a_0,r_0,s_1,a_1,r_1,\\ldots,s_T,a_T,r_T)$。' },
    { zh: '折扣因子', en: 'Discount Factor', cat: 'RL',
      def: '满足 $0 \\le \\gamma < 1$ 的标量，用来在回报中对未来奖励进行指数式降权，在即时性与长期收益之间取得权衡，并保证无限时域加总的收敛性。' },
    { zh: '同策略', en: 'On-policy', cat: 'RL',
      def: '强化学习中指数据恰好由智能体当前形式的模型所生成；在偏好微调文献中意义被放宽为「由该版本模型生成」，例如偏好微调前的指令微调检查点。' },
    { zh: '参考模型', en: 'Reference Model', cat: 'RLHF',
      def: 'RLHF 中使用的一组保存下来的参数 $\\pi_{\\mathrm{ref}}$，其输出被用来对优化过程进行正则化（regularize）。' }
  ];
  var CATS = ['ML', 'NLP', 'RL', 'RLHF'];

  var CSS = '' +
    '.appaw-tabs{display:flex;gap:8px;margin-bottom:14px;}' +
    '.appaw-tabs button.is-active{background:var(--accent-soft);border-color:var(--accent);color:var(--fg);}' +
    '.appaw-list{display:grid;gap:10px;}' +
    '.appaw-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 14px;}' +
    '.appaw-card h4{margin:0 0 6px;color:var(--fg);font-size:1rem;}' +
    '.appaw-en{color:var(--fg-muted);font-weight:normal;font-size:.85em;margin-left:6px;}' +
    '.appaw-badge{float:right;font-size:.72rem;padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent-2);border:1px solid var(--border);}' +
    '.appaw-def{color:var(--fg-muted);font-size:.92rem;line-height:1.7;}' +
    '.appaw-empty{color:var(--fg-muted);text-align:center;padding:24px 0;}' +
    '.appaw-flip{perspective:1000px;cursor:pointer;margin:14px 0;}' +
    '.appaw-inner{position:relative;height:250px;transition:transform .45s ease;transform-style:preserve-3d;}' +
    '.appaw-flip.is-flipped .appaw-inner{transform:rotateY(180deg);}' +
    '.appaw-face{position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border:1px solid var(--border);border-radius:14px;padding:20px;}' +
    '.appaw-front{background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}' +
    '.appaw-front .appaw-zh{font-size:1.6rem;font-weight:700;color:var(--fg);}' +
    '.appaw-front .appaw-en2{margin-top:8px;color:var(--fg-muted);}' +
    '.appaw-back{background:var(--accent-soft);transform:rotateY(180deg);overflow:auto;display:flex;}' +
    '.appaw-back .appaw-def{margin:auto;color:var(--fg);text-align:center;}' +
    '.appaw-hint{text-align:center;color:var(--fg-muted);font-size:.82rem;margin-top:10px;}' +
    '.appaw-nav{justify-content:center;margin-top:12px;}' +
    '.appaw-prog{color:var(--fg-muted);min-width:64px;text-align:center;}';

  /* 将含 $...$ 行内式的字符串渲染进元素 */
  function renderRich(el, text) {
    el.textContent = '';
    var parts = text.split(/\$([^$]+)\$/g);
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1 && window.katex) {
        var span = document.createElement('span');
        window.katex.render(parts[i], span, { throwOnError: false });
        el.appendChild(span);
      } else if (parts[i]) {
        el.appendChild(document.createTextNode(parts[i]));
      }
    }
  }

  function el(tag, cls, parent) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }

  function render(rootEl) {
    var state = { mode: 'browse', query: '', cat: 'all', order: TERMS.map(function (_, i) { return i; }), idx: 0, flipped: false };

    var style = document.createElement('style');
    style.textContent = CSS;
    rootEl.appendChild(style);

    var tabs = el('div', 'appaw-tabs', rootEl);
    var btnBrowse = el('button', '', tabs); btnBrowse.type = 'button'; btnBrowse.textContent = '浏览';
    var btnFlash = el('button', '', tabs); btnFlash.type = 'button'; btnFlash.textContent = '抽认卡';
    var body = el('div', '', rootEl);

    function setMode(mode) {
      state.mode = mode;
      btnBrowse.classList.toggle('is-active', mode === 'browse');
      btnFlash.classList.toggle('is-active', mode === 'flash');
      body.textContent = '';
      if (mode === 'browse') renderBrowse(); else renderFlash();
    }
    btnBrowse.addEventListener('click', function () { setMode('browse'); });
    btnFlash.addEventListener('click', function () { setMode('flash'); });

    /* ── 模式一：浏览 ── */
    function renderBrowse() {
      var bar = el('div', 'widget-row', body);
      var search = el('input', '', bar);
      search.type = 'text'; search.placeholder = '搜索中英名称或定义…'; search.value = state.query;
      search.style.flex = '1'; search.style.minWidth = '160px';
      var sel = el('select', '', bar);
      var optAll = el('option', '', sel); optAll.value = 'all'; optAll.textContent = '全部分类';
      CATS.forEach(function (c) {
        var o = el('option', '', sel); o.value = c; o.textContent = c;
      });
      sel.value = state.cat;
      var list = el('div', 'appaw-list', body);
      list.style.marginTop = '12px';

      function refresh() {
        list.textContent = '';
        var q = state.query.trim().toLowerCase();
        var shown = TERMS.filter(function (t) {
          if (state.cat !== 'all' && t.cat !== state.cat) return false;
          if (!q) return true;
          return (t.zh + ' ' + t.en + ' ' + t.def).toLowerCase().indexOf(q) !== -1;
        });
        if (!shown.length) {
          el('div', 'appaw-empty', list).textContent = '没有符合条件的词汇。';
          return;
        }
        shown.forEach(function (t) {
          var card = el('div', 'appaw-card', list);
          el('span', 'appaw-badge', card).textContent = t.cat;
          var h = el('h4', '', card);
          h.appendChild(document.createTextNode(t.zh));
          el('span', 'appaw-en', h).textContent = t.en;
          renderRich(el('div', 'appaw-def', card), t.def);
        });
      }
      search.addEventListener('input', function () { state.query = search.value; refresh(); });
      sel.addEventListener('change', function () { state.cat = sel.value; refresh(); });
      refresh();
    }

    /* ── 模式二：抽认卡 ── */
    function renderFlash() {
      var flip = el('div', 'appaw-flip', body);
      flip.setAttribute('role', 'button');
      flip.tabIndex = 0;
      var inner = el('div', 'appaw-inner', flip);
      var front = el('div', 'appaw-face appaw-front', inner);
      var back = el('div', 'appaw-face appaw-back', inner);
      var backDef = el('div', 'appaw-def', back);
      el('div', 'appaw-hint', body).textContent = '点击卡片可翻面查看定义';
      var nav = el('div', 'widget-row appaw-nav', body);
      var prev = el('button', '', nav); prev.type = 'button'; prev.textContent = '上一张';
      var prog = el('span', 'appaw-prog', nav);
      var next = el('button', '', nav); next.type = 'button'; next.textContent = '下一张';
      var shuf = el('button', '', nav); shuf.type = 'button'; shuf.textContent = '随机洗牌';

      function show() {
        var t = TERMS[state.order[state.idx]];
        front.textContent = '';
        el('div', 'appaw-zh', front).textContent = t.zh;
        el('div', 'appaw-en2', front).textContent = t.en + '　·　' + t.cat;
        renderRich(backDef, t.def);
        flip.classList.toggle('is-flipped', state.flipped);
        prog.textContent = (state.idx + 1) + ' / ' + TERMS.length;
        flip.setAttribute('aria-label', '抽认卡：' + t.zh + '（点击翻面）');
      }
      function go(delta) {
        state.idx = (state.idx + delta + TERMS.length) % TERMS.length;
        state.flipped = false;
        show();
      }
      flip.addEventListener('click', function () { state.flipped = !state.flipped; show(); });
      flip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.flipped = !state.flipped; show(); }
      });
      prev.addEventListener('click', function () { go(-1); });
      next.addEventListener('click', function () { go(1); });
      shuf.addEventListener('click', function () {
        for (var i = state.order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = state.order[i]; state.order[i] = state.order[j]; state.order[j] = tmp;
        }
        state.idx = 0; state.flipped = false; show();
      });
      show();
    }

    setMode('browse');
  }

  window.ChapterWidget = {
    title: 'RLHF 词汇抽认卡',
    intro: '收录附录 A 的 20 条核心词汇。可在「浏览」模式搜索与依分类筛选，或切换到「抽认卡」模式逐张翻面复习中英术语与定义。',
    render: render
  };
})();
