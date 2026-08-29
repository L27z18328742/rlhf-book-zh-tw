/* 第 13 章互动组件：工具调用流程模拟器 */
(function () {
  'use strict';

  var CSS = [
    '.c13-wrap{display:flex;flex-direction:column;gap:.8rem;font-size:.9rem;}',
    '.c13-main{display:flex;flex-wrap:wrap;gap:.8rem;align-items:stretch;}',
    '.c13-msgs{flex:2 1 260px;min-width:0;max-height:360px;overflow-y:auto;',
    '  display:flex;flex-direction:column;gap:.55rem;padding:.65rem;',
    '  border:1px solid var(--border);border-radius:10px;background:var(--panel);}',
    '.c13-side{flex:1 1 190px;min-width:0;display:flex;flex-direction:column;gap:.6rem;}',
    '.c13-card{border:1px solid var(--border);border-left:3px solid var(--fg-muted);',
    '  border-radius:8px;background:var(--panel-2);padding:.5rem .65rem;',
    '  animation:c13in .3s ease;}',
    '@keyframes c13in{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}',
    '.c13-badge{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;',
    '  font-size:.68rem;font-weight:700;letter-spacing:.06em;padding:.05rem .45rem;',
    '  border-radius:999px;border:1px solid var(--border);margin-bottom:.35rem;}',
    '.c13-card.c13-system{border-left-color:var(--fg-muted);}',
    '.c13-card.c13-user{border-left-color:var(--link);}',
    '.c13-card.c13-assistant{border-left-color:var(--accent);}',
    '.c13-card.c13-tool{border-left-color:var(--accent-2);}',
    '.c13-system .c13-badge{color:var(--fg-muted);}',
    '.c13-user .c13-badge{color:var(--link);border-color:var(--link);}',
    '.c13-assistant .c13-badge{color:var(--accent);border-color:var(--accent);}',
    '.c13-tool .c13-badge{color:var(--accent-2);border-color:var(--accent-2);}',
    '.c13-think{font-style:italic;color:var(--fg-muted);line-height:1.6;}',
    '.c13-json{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.78rem;',
    '  line-height:1.55;background:var(--code-bg);border-radius:6px;padding:.5rem .6rem;',
    '  margin:.25rem 0 0;overflow-x:auto;white-space:pre;color:var(--fg);}',
    '.c13-json.c13-call{border:1px solid var(--accent);}',
    '.c13-json.c13-res{border:1px solid var(--accent-2);}',
    '.c13-note{font-size:.78rem;color:var(--fg-muted);line-height:1.55;padding:.1rem .2rem 0 .5rem;',
    '  border-left:2px dotted var(--border);margin-left:.3rem;animation:c13in .3s ease;}',
    '.c13-status{font-weight:600;color:var(--fg);line-height:1.5;}',
    '.c13-status b{color:var(--accent);}',
    '.c13-pc{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.72rem;',
    '  line-height:1.7;background:var(--code-bg);border:1px solid var(--border);',
    '  border-radius:8px;padding:.5rem .55rem;margin:0;overflow-x:auto;}',
    '.c13-pc div{white-space:pre;color:var(--fg-muted);border-radius:4px;padding:0 .3rem;}',
    '.c13-pc div.c13-hl{background:var(--accent-soft);color:var(--fg);font-weight:600;}',
    '.c13-ctr{font-size:.78rem;color:var(--fg-muted);margin-left:auto;align-self:center;}',
    '.c13-sidehead{font-size:.72rem;font-weight:700;letter-spacing:.1em;color:var(--fg-muted);margin:0;}'
  ].join('\n');

  var PC_LINES = [
    'messages = [system, user]',
    'while True:',
    '  response = model(messages, tools)',
    '  if not response.tool_calls:',
    '    return response.text',
    '  for call in response.tool_calls:',
    '    result = execute_tool(call)',
    '    messages.append({role:"tool",...})'
  ];

  /* 各步骤类型对应的循环状态与伪代码行 */
  var PHASE = {
    thinking: { state: '模型生成中（推理）', line: 2 },
    call:     { state: '等待工具结果（编排器执行中）', line: 6 },
    result:   { state: '结果写回 messages，模型继续', line: 7 },
    final:    { state: '无 tool_calls → 循环结束', line: 4 }
  };

  var SYSTEM_PROMPT = '你是一个函数调用 AI 模型。可用工具：get_weather(location)、' +
    'calculator(expression)。不要臆测要代入函数的参数值。';

  function weather(loc, temp, cond) {
    return { location: loc, temp_c: temp, condition: cond };
  }

  var SCENARIOS = [
    {
      label: '情境 1｜查天气：「东京现在几度？」（单步工具）',
      user: '东京现在几度？',
      steps: [
        { type: 'thinking',
          text: '用户问的是「现在」的气温——我的权重来自过往数据，没有即时信息。应该调用 get_weather 而不是凭记忆乱猜。',
          note: '模型在推理中判断「需要外部信息」→ 停止一般生成，准备发出结构化调用。' },
        { type: 'call', id: 'call_1',
          json: { name: 'get_weather', arguments: { location: 'Tokyo' } },
          note: '这段 JSON 是模型生成的特殊词元：工具名称 + 符合 schema 的参数。编排器拦截它并暂停生成。' },
        { type: 'result', id: 'call_1', json: weather('Tokyo', 31, '晴'),
          note: '工具输出以 role:"tool" 附加进 messages——训练时这些词元会从损失函数中被遮蔽。' },
        { type: 'final', text: '东京目前约 31°C，天气晴朗。',
          note: '模型读到工具结果后继续自回归生成；这次没有 tool_calls，循环返回最终文字。' }
      ]
    },
    {
      label: '情境 2｜计算：「37 × 89 − 12 = ?」（calculator）',
      user: '37 × 89 − 12 = ?',
      steps: [
        { type: 'thinking',
          text: '这是需要精确答案的算术。与其用概率式生成「背」出数字并冒着幻觉风险，不如交给 calculator 工具。',
          note: '工具让模型绕过其概率式、生成式的天性，取得精确答案（对应书中圆周率的例子）。' },
        { type: 'call', id: 'call_1',
          json: { name: 'calculator', arguments: { expression: '37 * 89 - 12' } },
          note: '函数调用：参数必须符合声明式 schema，剖析与验证才得以可靠进行。' },
        { type: 'result', id: 'call_1', json: { expression: '37 * 89 - 12', result: 37 * 89 - 12 },
          note: '编排器执行 execute_tool(call.name, call.args)，把确定性的计算结果注入序列。' },
        { type: 'final', text: '37 × 89 − 12 = ' + (37 * 89 - 12) + '。',
          note: '模型把工具结果纳入回应——它学到的是「何时该调用、如何引用结果」，而非硬背算术。' }
      ]
    },
    {
      label: '情境 3｜多步推理：「台北比东京暖几度？」（两次 get_weather）',
      user: '台北比东京暖几度？',
      steps: [
        { type: 'thinking',
          text: '要比较两地气温，我需要两笔即时数据。先查台北，再查东京，最后相减。',
          note: 'ReAct 式交错：推理轨迹帮模型拟定多步行动计划，动作则负责搜集外部信息。' },
        { type: 'call', id: 'call_1',
          json: { name: 'get_weather', arguments: { location: 'Taipei' } },
          note: '第一次工具调用：模型一次只发出计划中的一步，等结果回来再决定下一步。' },
        { type: 'result', id: 'call_1', json: weather('Taipei', 34, '多云'),
          note: '第一笔观测 o₁ 回到上下文。单靠这笔还无法回答——循环将再跑一轮。' },
        { type: 'thinking',
          text: '台北 34°C，已知。还缺东京的气温，再发一次 get_weather。',
          note: '模型读取先前的工具结果后更新行动计划——这就是多步骤工具推理的核心。' },
        { type: 'call', id: 'call_2',
          json: { name: 'get_weather', arguments: { location: 'Tokyo' } },
          note: '第二次工具调用：同一个工具、不同参数。编排循环对每轮一视同仁。' },
        { type: 'result', id: 'call_2', json: weather('Tokyo', 31, '晴'),
          note: '两笔数据都在 messages 里了。接下来模型可以纯靠上下文推理，不需再调用工具。' },
        { type: 'thinking',
          text: '34 − 31 = 3。信息齐全，可以直接回答。',
          note: '模型在推理中判断「不再需要外部信息」→ 这轮生成不会发出 tool_calls。' },
        { type: 'final', text: '台北（34°C）比东京（31°C）暖约 3°C。',
          note: '完整轨迹：两次「动作→观测」交替后才得出答案——正是图 40 描述的多步 rollout。' }
      ]
    }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function makeCard(role, badgeText) {
    var card = el('div', 'c13-card c13-' + role);
    card.appendChild(el('span', 'c13-badge', badgeText || role));
    return card;
  }

  function render(rootEl) {
    if (!document.getElementById('c13-style')) {
      var st = el('style');
      st.id = 'c13-style';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var wrap = el('div', 'c13-wrap');

    /* 控制列 */
    var row = el('div', 'widget-row');
    var sel = el('select');
    SCENARIOS.forEach(function (s, i) {
      var opt = el('option', null, s.label);
      opt.value = String(i);
      sel.appendChild(opt);
    });
    var btnNext = el('button', null, '下一步 ▶');
    var btnReplay = el('button', null, '重播');
    var counter = el('span', 'c13-ctr', '');
    row.appendChild(sel); row.appendChild(btnNext); row.appendChild(btnReplay);
    row.appendChild(counter);

    /* 主体：messages 可视化 + 侧栏 */
    var main = el('div', 'c13-main');
    var msgs = el('div', 'c13-msgs');
    var side = el('div', 'c13-side widget-panel');
    var status = el('div', 'c13-status', '');
    var pc = el('pre', 'c13-pc');
    var pcRows = PC_LINES.map(function (line) {
      var d = el('div', null, line);
      pc.appendChild(d);
      return d;
    });
    side.appendChild(el('p', 'c13-sidehead', '编排循环状态'));
    side.appendChild(status);
    side.appendChild(pc);
    main.appendChild(msgs); main.appendChild(side);

    wrap.appendChild(row); wrap.appendChild(main);
    rootEl.appendChild(wrap);

    var scen = SCENARIOS[0];
    var idx = 0;      /* 下一个要播放的步骤 */
    var loopK = 0;    /* 第几次调用 model()（循环第 k 步） */

    function highlight(line) {
      pcRows.forEach(function (r, i) { r.classList.toggle('c13-hl', i === line); });
    }

    function setStatus(k, state, line) {
      status.innerHTML = '';
      status.appendChild(el('span', null, '第 '));
      status.appendChild(el('b', null, String(k)));
      status.appendChild(el('span', null, ' 步｜' + state));
      highlight(line);
    }

    function scrollDown() {
      msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });
    }

    function addNote(text) {
      msgs.appendChild(el('div', 'c13-note', '解读：' + text));
    }

    function reset() {
      scen = SCENARIOS[Number(sel.value)];
      idx = 0; loopK = 0;
      msgs.innerHTML = '';
      var sys = makeCard('system', 'system');
      sys.appendChild(el('div', null, SYSTEM_PROMPT));
      msgs.appendChild(sys);
      var usr = makeCard('user', 'user');
      usr.appendChild(el('div', null, scen.user));
      msgs.appendChild(usr);
      setStatus(0, '尚未开始，按「下一步」播放', 0);
      btnNext.disabled = false;
      counter.textContent = '步骤 0 / ' + scen.steps.length;
      msgs.scrollTop = 0;
    }

    function playStep() {
      if (idx >= scen.steps.length) return;
      var step = scen.steps[idx];
      var card;

      if (step.type === 'thinking' || step.type === 'final') loopK += 1;

      if (step.type === 'thinking') {
        card = makeCard('assistant', 'assistant · 思考');
        card.appendChild(el('div', 'c13-think', step.text));
      } else if (step.type === 'call') {
        card = makeCard('assistant', 'assistant · tool call');
        var pre1 = el('pre', 'c13-json c13-call');
        pre1.textContent = JSON.stringify(
          { id: step.id, type: 'function', 'function': step.json }, null, 2);
        card.appendChild(pre1);
      } else if (step.type === 'result') {
        card = makeCard('tool', 'tool');
        var pre2 = el('pre', 'c13-json c13-res');
        pre2.textContent = JSON.stringify(
          { tool_call_id: step.id, content: step.json }, null, 2);
        card.appendChild(pre2);
      } else {
        card = makeCard('assistant', 'assistant · 最终回答');
        card.appendChild(el('div', null, step.text));
      }

      msgs.appendChild(card);
      addNote(step.note);
      scrollDown();

      var ph = PHASE[step.type];
      setStatus(loopK, ph.state, ph.line);

      idx += 1;
      counter.textContent = '步骤 ' + idx + ' / ' + scen.steps.length;
      if (idx >= scen.steps.length) btnNext.disabled = true;
    }

    btnNext.addEventListener('click', playStep);
    btnReplay.addEventListener('click', reset);
    sel.addEventListener('change', reset);
    reset();
  }

  window.ChapterWidget = {
    title: '工具调用流程模拟器',
    intro: '逐步播放语言模型如何在生成中交错工具调用：模型推理 → 发出结构化 tool call → ' +
      '编排器执行工具并把结果写回 messages → 模型继续生成，直到不再需要工具为止。' +
      '侧栏同步标示书中「编排循环」伪代码目前执行到哪一行。',
    render: render
  };
})();
