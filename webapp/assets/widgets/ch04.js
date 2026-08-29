/* 第 4 章互动组件：聊天模板建构器（Chat Template Playground） */
(function () {
  'use strict';

  function sp(t) { return { t: t, special: true }; }
  function pl(t) { return { t: t, special: false }; }

  // 三种聊天模板的序列化规则（格式依本章翻译稿）
  var TEMPLATES = {
    chatml: {
      label: 'ChatML',
      note: 'ChatML（Chat Markup Language）源自 OpenAI，是早期标准化消息格式的尝试：每则消息以 <|im_start|>role 开头、<|im_end|> 收尾。',
      head: function (role) { return [sp('<|im_start|>'), pl(role + '\n')]; },
      tail: function () { return [sp('<|im_end|>'), pl('\n')]; },
      gen: function () { return [sp('<|im_start|>'), pl('assistant\n')]; }
    },
    zephyr: {
      label: 'Zephyr',
      note: 'Zephyr 模板出自 Hugging Face H4 团队的 Zephyr 模型：以 <|system|>、<|user|>、<|assistant|> 标记角色，每则消息以 </s> 收尾。',
      head: function (role) { return [sp('<|' + role + '|>'), pl('\n')]; },
      tail: function () { return [sp('</s>'), pl('\n')]; },
      gen: function () { return [sp('<|assistant|>'), pl('\n')]; }
    },
    tulu: {
      label: 'Tülu',
      note: 'Tülu 模板出自 AI2（Allen Institute for AI）的 Tülu 系列：格式极简，角色标签后换行直接接内容，仅 assistant 回复以 <|endoftext|> 收尾。',
      head: function (role) { return [sp('<|' + role + '|>'), pl('\n')]; },
      tail: function (role) { return role === 'assistant' ? [sp('<|endoftext|>'), pl('\n')] : [pl('\n')]; },
      gen: function () { return [sp('<|assistant|>'), pl('\n')]; }
    }
  };

  var state = {
    template: 'chatml',
    showMask: false,
    genPrompt: false,
    system: '你是一位友善的聊天机器人，总是以海盗的口吻回答。',
    rounds: [
      { user: '一个人一餐能吃下几架直升机？', assistant: '哎呀，就 6 架而已，伙计！' },
      { user: '你确定吗？', assistant: '哈哈，当然是玩笑话——直升机可吃不得，伙计！' }
    ]
  };

  // 把目前对话状态序列化成带标记的片段串列
  function serialize() {
    var tpl = TEMPLATES[state.template];
    var msgs = [];
    if (state.system.trim() !== '') msgs.push({ role: 'system', content: state.system });
    state.rounds.forEach(function (r) {
      msgs.push({ role: 'user', content: r.user });
      msgs.push({ role: 'assistant', content: r.assistant });
    });
    var out = [];
    msgs.forEach(function (m) {
      // 角色开头标签属于提示结构，一律遮罩
      tpl.head(m.role).forEach(function (s) { s.loss = false; out.push(s); });
      // 消息内容：只有 assistant 回复计算损失
      out.push({ t: m.content, special: false, loss: m.role === 'assistant' });
      // 结尾词元跟随所属消息：assistant 的 EOS 也要学（模型才知道何时停）
      tpl.tail(m.role).forEach(function (s) { s.loss = m.role === 'assistant'; out.push(s); });
    });
    if (state.genPrompt) tpl.gen().forEach(function (s) { s.loss = false; out.push(s); });
    return out;
  }

  function el(tag, styleText, text) {
    var n = document.createElement(tag);
    if (styleText) n.style.cssText = styleText;
    if (text != null) n.textContent = text;
    return n;
  }

  var refs = {}; // 持有需要更新的 DOM 节点

  function renderOutput() {
    var pre = refs.pre;
    pre.textContent = '';
    pre.style.background = state.showMask ? 'var(--panel)' : 'var(--code-bg)';
    serialize().forEach(function (s) {
      var span = document.createElement('span');
      span.textContent = s.t;
      if (s.special) span.style.cssText = 'color:var(--accent);font-weight:600;';
      if (state.showMask) {
        span.style.background = s.loss ? 'var(--accent-soft)' : 'var(--border)';
        span.style.borderRadius = '3px';
      }
      pre.appendChild(span);
    });
    refs.legend.style.display = state.showMask ? '' : 'none';
    refs.note.textContent = '模板出处：' + TEMPLATES[state.template].note;
  }

  function textarea(value, onInput) {
    var ta = document.createElement('textarea');
    ta.rows = 2;
    ta.value = value;
    ta.style.cssText = 'width:100%;resize:vertical;';
    ta.addEventListener('input', function () { onInput(ta.value); renderOutput(); });
    return ta;
  }

  function roleLabel(text) {
    return el('div', 'font-size:.78rem;font-weight:600;color:var(--fg-muted);margin:.4rem 0 .2rem;', text);
  }

  // 重建对话编辑区（添加／删除轮次时调用）
  function renderEditor() {
    var box = refs.editor;
    box.textContent = '';
    box.appendChild(roleLabel('system（系统提示，留空则省略）'));
    box.appendChild(textarea(state.system, function (v) { state.system = v; }));

    state.rounds.forEach(function (round, i) {
      var card = el('div', 'border:1px solid var(--border);border-radius:8px;padding:.6rem .8rem;margin-top:.8rem;background:var(--panel);');
      var bar = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:.5rem;');
      bar.appendChild(el('strong', 'font-size:.85rem;', '第 ' + (i + 1) + ' 轮'));
      var del = el('button', 'font-size:.78rem;', '删除');
      del.disabled = state.rounds.length <= 1;
      del.addEventListener('click', function () {
        state.rounds.splice(i, 1);
        renderEditor();
        renderOutput();
      });
      bar.appendChild(del);
      card.appendChild(bar);
      card.appendChild(roleLabel('user（用户）'));
      card.appendChild(textarea(round.user, function (v) { round.user = v; }));
      card.appendChild(roleLabel('assistant（助理）'));
      card.appendChild(textarea(round.assistant, function (v) { round.assistant = v; }));
      box.appendChild(card);
    });

    var add = el('button', 'margin-top:.8rem;', '＋ 添加一轮');
    add.addEventListener('click', function () {
      state.rounds.push({ user: '（输入新的用户消息）', assistant: '（输入新的助理回复）' });
      renderEditor();
      renderOutput();
    });
    box.appendChild(add);
  }

  function legendChip(bg, text) {
    var wrap = el('span', 'display:inline-flex;align-items:center;gap:.35rem;font-size:.8rem;color:var(--fg-muted);');
    wrap.appendChild(el('span', 'width:.9rem;height:.9rem;border-radius:3px;border:1px solid var(--border);background:' + bg + ';'));
    wrap.appendChild(document.createTextNode(text));
    return wrap;
  }

  function render(rootEl) {
    // 面板一：对话编辑
    var panel1 = el('div', null); panel1.className = 'widget-panel';
    panel1.appendChild(el('h4', 'margin:.1rem 0 .5rem;font-size:.95rem;', '① 编辑对话'));
    refs.editor = el('div', null);
    panel1.appendChild(refs.editor);
    rootEl.appendChild(panel1);

    // 面板二：模板与序列化输出
    var panel2 = el('div', 'margin-top:1rem;'); panel2.className = 'widget-panel';
    panel2.appendChild(el('h4', 'margin:.1rem 0 .5rem;font-size:.95rem;', '② 套用聊天模板'));

    var row = el('div', null); row.className = 'widget-row';
    var selLabel = el('label', 'display:inline-flex;align-items:center;gap:.4rem;font-size:.88rem;', '模板：');
    var sel = document.createElement('select');
    Object.keys(TEMPLATES).forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = TEMPLATES[key].label;
      sel.appendChild(opt);
    });
    sel.value = state.template;
    sel.addEventListener('change', function () { state.template = sel.value; renderOutput(); });
    selLabel.appendChild(sel);
    row.appendChild(selLabel);

    [['showMask', '显示损失遮罩'], ['genPrompt', '附加生成提示（add_generation_prompt）']].forEach(function (pair) {
      var lab = el('label', 'display:inline-flex;align-items:center;gap:.35rem;font-size:.88rem;cursor:pointer;');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state[pair[0]];
      cb.addEventListener('change', function () { state[pair[0]] = cb.checked; renderOutput(); });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(pair[1]));
      row.appendChild(lab);
    });
    panel2.appendChild(row);

    // 模板出处的一句话解读
    refs.note = el('p', 'margin:.6rem 0 0;font-size:.85rem;color:var(--fg-muted);');
    panel2.appendChild(refs.note);

    // 序列化输出
    refs.pre = el('pre', 'margin:.7rem 0 0;padding:.9rem 1rem;border:1px solid var(--border);border-radius:8px;' +
      'font-family:var(--mono,monospace);font-size:.84rem;line-height:1.85;white-space:pre-wrap;word-break:break-word;overflow-x:auto;color:var(--fg);');
    panel2.appendChild(refs.pre);

    // 图例：损失遮罩说明
    refs.legend = el('div', 'display:flex;flex-wrap:wrap;gap:.8rem;align-items:center;margin-top:.6rem;');
    refs.legend.appendChild(legendChip('var(--border)', 'prompt／user 部分（遮罩，不计损失）'));
    refs.legend.appendChild(legendChip('var(--accent-soft)', 'assistant 回复（计算损失）'));
    refs.legend.appendChild(el('span', 'font-size:.8rem;color:var(--fg-muted);flex-basis:100%;',
      'SFT 只对助理 token 计算损失（prompt masking）：模型不学着预测用户查询，只学习生成回应与结尾词元。'));
    panel2.appendChild(refs.legend);

    rootEl.appendChild(panel2);
    renderEditor();
    renderOutput();
  }

  window.ChapterWidget = {
    title: '聊天模板建构器',
    intro: '编辑多轮对话并切换 ChatML／Zephyr／Tülu 模板，即时观察消息如何被序列化成词元序列；打开损失遮罩，看看 SFT 为什么「只学回应、不学提示」。',
    render: render
  };
})();
