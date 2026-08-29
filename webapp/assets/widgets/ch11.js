/* 第 11 章互动组件：当一次偏好标注员 */
(function () {
  'use strict';

  var QUESTIONS = [
    {
      bias: '陷阱一：长度与格式偏误',
      prompt: '请简单介绍光合作用的基本过程。',
      a: '光合作用是植物将光能转换为化学能的重要生化反应，可整理为以下几个重点：' +
         '<ul><li><strong>发生场所</strong>：植物细胞内的叶绿体</li>' +
         '<li><strong>反应原料</strong>：二氧化碳与水</li>' +
         '<li><strong>主要产物</strong>：葡萄糖与<strong>氮气</strong></li>' +
         '<li><strong>能量来源</strong>：太阳光</li></ul>' +
         '整体而言，光合作用是地球生态系能量流动的起点，重要性不言可喻。',
      b: '光合作用是植物利用阳光，在叶绿体中把二氧化碳和水转化成葡萄糖、并释放氧气的过程。',
      majority: 'A', pct: 64,
      explain: 'A 排版精美、看起来更「专业」，却把产物中的「氧气」写成了「氮气」；B 虽然只有一句话，内容完全正确。' +
        '研究显示，标注者会不成比例地偏爱较长、格式漂亮的回复——这就是冗长偏误（verbosity）与格式偏误，也是模型愈训练愈啰嗦的原因之一。'
    },
    {
      bias: '陷阱二：风格偏好，无标准答案',
      prompt: '同事下周要离职了，帮我写一句简短的祝福。',
      a: '一路顺风啦！到了新公司要记得照顾好自己，有空常回来找我们喝一杯！',
      b: '祝您鹏程万里，在新的职涯旅程中一帆风顺、大展长才。',
      majority: 'A', pct: 52,
      explain: '两个回复都正确完成了任务，差别只在语气：一个口语亲切、一个正式得体。' +
        '这类题目没有标准答案，52% 对 48% 的分布几乎等于掷硬币——你的选择反映的是个人风格偏好，这正是偏好数据中「合理噪声」的主要来源。'
    },
    {
      bias: '陷阱三：谄媚与自信偏误',
      prompt: '维他命 C 可以预防感冒吗？',
      a: '可以！维他命 C 已被证实能有效预防感冒，每天补充 1000 毫克就能大幅降低感冒概率，这是医学界的共识。',
      b: '就目前的研究来看，维他命 C 对一般人恐怕没有预防感冒的效果；部分研究显示它或许能稍微缩短病程，但证据仍有限。建议再咨询医师等专业意见。',
      majority: 'A', pct: 58,
      explain: 'A 语气笃定、还宣称「医学界共识」，让人觉得可靠，但内容与研究证据不符；B 坦承不确定，方向却是对的。' +
        '标注者倾向奖励自信、迎合的语气，这种谄媚（sycophancy）偏误一旦被奖励模型学走，模型就会愈来愈敢「自信地胡说」。'
    },
    {
      bias: '对照组：质量差距明显',
      prompt: '请用一句话解释什么是 RLHF。',
      a: 'RLHF（人类反馈强化学习）是先搜集人类对模型回复的偏好、训练出奖励模型，再用强化学习让语言模型往人类偏好的方向调整的技术。',
      b: 'RLHF 就是一种 AI 技术，很多公司都在用，总之就是让 AI 变得更好、更聪明的方法。',
      majority: 'A', pct: 93,
      explain: '这题是对照组：A 准确交代了「偏好数据、奖励模型、强化学习」三个环节，B 空洞含糊。' +
        '当质量差距明显时，标注者一致率会很高；真正花钱又花力气的，是前三题那种灰色地带。'
    }
  ];
  var SCALE = ['1 非常差', '2 不佳', '3 尚可', '4 良好', '5 优异'];
  var state = { root: null, idx: 0, answers: [] };

  function el(tag, style, html) {
    var n = document.createElement(tag);
    if (style) n.style.cssText = style;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function chip(text, strong) {
    return el('span', 'display:inline-block;font-size:.78em;padding:.1em .6em;border-radius:999px;' +
      'border:1px solid ' + (strong ? 'var(--accent)' : 'var(--border)') + ';' +
      'background:' + (strong ? 'var(--accent-soft)' : 'var(--panel)') + ';color:var(--fg);', text);
  }
  function promptPanel(text) {
    var p = el('div', 'border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;' +
      'background:var(--panel);padding:.6rem .9rem;margin:.75rem 0;');
    p.appendChild(el('div', 'font-size:.78em;color:var(--fg-muted);margin-bottom:.2rem;', '提示词'));
    p.appendChild(el('div', 'font-weight:600;', text));
    return p;
  }

  function renderQuestion() {
    var q = QUESTIONS[state.idx];
    var root = state.root;
    root.innerHTML = '';

    var head = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap;');
    head.appendChild(el('strong', '', '第 ' + (state.idx + 1) + ' / ' + QUESTIONS.length + ' 题'));
    var dots = el('div', 'display:flex;gap:.35rem;');
    QUESTIONS.forEach(function (_, i) {
      dots.appendChild(el('span', 'width:.6em;height:.6em;border-radius:50%;display:inline-block;' +
        'background:' + (i < state.idx ? 'var(--accent)' : i === state.idx ? 'var(--accent-2)' : 'var(--border)') + ';'));
    });
    head.appendChild(dots);
    root.appendChild(head);
    root.appendChild(el('p', 'color:var(--fg-muted);margin:.5rem 0 0;font-size:.9em;',
      '请站在一般用户的角度，点击你认为<strong>较好</strong>的回复。'));
    root.appendChild(promptPanel(q.prompt));

    var row = el('div', '');
    row.className = 'widget-row';
    row.style.alignItems = 'stretch';
    var feedback = el('div', 'margin-top: .9rem;');
    var cards = {};
    ['A', 'B'].forEach(function (key) {
      var card = el('div', 'flex:1 1 240px;min-width:0;border:1px solid var(--border);border-radius:10px;' +
        'background:var(--panel);padding:.7rem .9rem;cursor:pointer;');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', '选择回复 ' + key);
      var badgeRow = el('div', 'display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-bottom:.45rem;');
      badgeRow.appendChild(el('strong', 'color:var(--accent);', '回复 ' + key));
      card.appendChild(badgeRow);
      card.appendChild(el('div', 'font-size:.92em;line-height:1.65;', key === 'A' ? q.a : q.b));
      card.addEventListener('click', function () { choose(key, q, cards, feedback); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(key, q, cards, feedback); }
      });
      cards[key] = card;
      row.appendChild(card);
    });
    root.appendChild(row);
    root.appendChild(feedback);
  }

  function choose(key, q, cards, feedback) {
    if (feedback.childNodes.length) return; // 已作答
    var match = key === q.majority;
    state.answers.push({ key: key, match: match });

    ['A', 'B'].forEach(function (k) {
      var c = cards[k];
      c.style.cursor = 'default';
      c.removeAttribute('role');
      c.setAttribute('tabindex', '-1');
      var badges = c.firstChild;
      if (k === key) {
        c.style.borderColor = 'var(--accent)';
        c.style.background = 'var(--accent-soft)';
        badges.appendChild(chip('你的选择', true));
      }
      if (k === q.majority) badges.appendChild(chip('多数选择 ' + q.pct + '%', false));
    });

    var panel = el('div', 'border-left:3px solid var(--accent-2);');
    panel.className = 'widget-panel';
    panel.appendChild(el('div', 'margin-bottom:.35rem;',
      '多数标注者（' + q.pct + '%）选了<strong>回复 ' + q.majority + '</strong>，你与多数' +
      (match ? '<strong>一致</strong>。' : '<strong>不一致</strong>。')));
    panel.appendChild(el('div', 'font-size:.9em;margin-bottom:.5rem;',
      '<strong>' + q.bias + '</strong>　' + q.explain));
    var next = el('button', '', state.idx + 1 < QUESTIONS.length ? '下一题' : '查看总结');
    next.addEventListener('click', function () {
      state.idx += 1;
      if (state.idx < QUESTIONS.length) renderQuestion(); else renderSummary();
    });
    panel.appendChild(next);
    feedback.appendChild(panel);
    if (typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderSummary() {
    var root = state.root;
    root.innerHTML = '';
    var hits = state.answers.filter(function (a) { return a.match; }).length;

    root.appendChild(el('h4', 'margin:.2rem 0 .6rem;', '标注结果总结'));
    var panel = el('div', '');
    panel.className = 'widget-panel';
    panel.appendChild(el('div', 'font-size:1.05em;margin-bottom:.5rem;',
      '你与「多数标注者」的一致率：<strong>' + hits + ' / ' + QUESTIONS.length +
      '（' + Math.round(hits / QUESTIONS.length * 100) + '%）</strong>'));
    var list = el('ul', 'margin:.3rem 0 .6rem;padding-left:1.2em;font-size:.9em;');
    QUESTIONS.forEach(function (q, i) {
      var a = state.answers[i];
      list.appendChild(el('li', 'margin:.2em 0;', '第 ' + (i + 1) + ' 题（' + q.bias.replace(/^[^：]+：/, '') +
        '）：你选 ' + a.key + '，多数选 ' + q.majority + '——' +
        (a.match ? '一致' : '<span style="color:var(--accent-2)">不一致</span>')));
    });
    panel.appendChild(list);
    panel.appendChild(el('p', 'font-size:.9em;color:var(--fg-muted);margin:0;',
      '注意：一致率高不代表判断正确——第 1、3 题的「多数」其实都掉进了偏误陷阱。一致率量测的是噪声，不是真理。'));
    root.appendChild(panel);

    var key = el('div', 'border-left:3px solid var(--accent);margin-top:.9rem;');
    key.className = 'widget-panel';
    key.appendChild(el('div', '', '<strong>书中重点</strong>：即使有详尽的标注指引，标注者之间的一致率通常也只有 <strong>60～80%</strong>。' +
      '偏好数据记录的不是「正确答案」，而是「相对于另一个选项哪个较好」的主观判断，本质上就是有噪声的。' +
      '能否辨识并缓解冗长、格式、谄媚这些细微偏误，正是「好的」与「卓越的」偏好数据——以及 RLHF 训练——之间的分野。'));
    root.appendChild(key);

    root.appendChild(renderLikert());

    var restartBtn = el('button', 'margin-top:1rem;', '重新开始');
    restartBtn.addEventListener('click', function () { state.idx = 0; state.answers = []; renderQuestion(); });
    root.appendChild(restartBtn);
  }

  /* 附加对照：同一题改用 1～5 评分（ratings）接口 */
  function renderLikert() {
    var q = QUESTIONS[1];
    var box = el('div', 'margin-top:1.2rem;');
    box.appendChild(el('h4', 'margin:.2rem 0 .4rem;', '附加对照：如果改用评分（Ratings）呢？'));
    box.appendChild(el('p', 'font-size:.9em;color:var(--fg-muted);margin:0 0 .5rem;',
      '刚才你做的是<strong>排序（rankings）</strong>：在两个回复之间选出相对较好的一个。' +
      '另一种搜集方式是<strong>评分（ratings）</strong>：不做比较，而是替每段回复各自打 1～5 分。' +
      '试着替第 2 题（离职祝福）的两个回复评分：'));
    box.appendChild(promptPanel(q.prompt));

    var scores = { A: 0, B: 0 };
    var result = el('div', 'margin-top:.6rem;');
    ['A', 'B'].forEach(function (key) {
      var line = el('div', 'border:1px solid var(--border);border-radius:8px;background:var(--panel);' +
        'padding:.55rem .8rem;margin-bottom:.5rem;');
      line.appendChild(el('div', 'font-size:.88em;margin-bottom:.4rem;',
        '<strong style="color:var(--accent)">回复 ' + key + '</strong>　' + (key === 'A' ? q.a : q.b)));
      var row = el('div', 'display:flex;gap:.35rem;flex-wrap:wrap;');
      var btns = SCALE.map(function (label, i) {
        var b = el('button', 'font-size:.82em;padding:.15em .5em;', label);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          scores[key] = i + 1;
          btns.forEach(function (x, j) {
            var on = j === i;
            x.setAttribute('aria-pressed', String(on));
            x.style.background = on ? 'var(--accent-soft)' : '';
            x.style.borderColor = on ? 'var(--accent)' : '';
          });
          updateLikertResult(scores, result);
        });
        row.appendChild(b);
        return b;
      });
      line.appendChild(row);
      box.appendChild(line);
    });
    box.appendChild(result);
    return box;
  }

  function updateLikertResult(scores, result) {
    if (!scores.A || !scores.B) return;
    result.innerHTML = '';
    var panel = el('div', 'border-left:3px solid var(--accent-2);');
    panel.className = 'widget-panel';
    var msg;
    if (scores.A === scores.B) {
      msg = '两者同分（各 ' + scores.A + ' 分）——评分制允许平手，这时就凑不出偏好对（chosen / rejected）。';
    } else {
      var hi = scores.A > scores.B ? 'A' : 'B', lo = hi === 'A' ? 'B' : 'A';
      msg = '换算成偏好数据：<strong>' + hi + '（' + scores[hi] + ' 分）为 chosen、' + lo + '（' + scores[lo] +
        ' 分）为 rejected</strong>。UltraFeedback 等数据集正是这样把评分转成偏好对：取最高分的回复，搭配一个分数较低的。';
    }
    panel.appendChild(el('div', 'font-size:.9em;margin-bottom:.4rem;', msg));
    panel.appendChild(el('div', 'font-size:.88em;color:var(--fg-muted);',
      '两种格式的结构差异：排序强迫你表态相对好坏，信号明确，但丢失「差多少」；评分保留每段文字的绝对质量信息，却可能整批同分。' +
      '实际应用中最常见的做法，仍是以排序（如 5 点 Likert 比较量表：A≫B、A>B、平手、B>A、B≫A）搜集训练用偏好，评分则常作为中继数据保留。'));
    result.appendChild(panel);
  }

  window.ChapterWidget = {
    title: '当一次偏好标注员',
    intro: '四题偏好比较任务，体验数据标注员的日常：读完提示词与两个回复，点击你认为较好的一个，' +
      '再对照多数标注者的选择——看看其中藏了哪些偏误陷阱，以及排序与评分两种搜集方式的差异。',
    render: function (rootEl) { state.root = rootEl; state.idx = 0; state.answers = []; renderQuestion(); }
  };
})();
