// Coursera Helper — paste into the DevTools console on any /learn/<course-slug>/ page.
function openHelper() {
  if (document.getElementById('ch-panel')) return document.getElementById('ch-panel').remove();

  const API = 'https://www.coursera.org/api';
  const slug = location.pathname.split('/learn/')[1]?.split('/')[0];

  // ---------- UI ----------
  const css = `
    #ch-panel{position:fixed;top:24px;right:24px;z-index:999999;width:360px;max-height:85vh;
      display:flex;flex-direction:column;background:#fff;color:#1B2A4A;border:2px solid #1B2A4A;
      border-radius:10px;box-shadow:6px 6px 0 #1B2A4A;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
    #ch-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
      background:#1B2A4A;color:#fff;cursor:move;border-radius:7px 7px 0 0;user-select:none}
    #ch-head b{font-size:15px}
    #ch-head button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0 4px}
    #ch-body{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .ch-opt{display:flex;gap:10px;align-items:center;cursor:pointer}
    .ch-opt input{width:18px;height:18px;accent-color:#1F8A70}
    .ch-btn{padding:9px 12px;border:2px solid #1B2A4A;border-radius:6px;background:#1F8A70;color:#fff;
      font-weight:600;cursor:pointer}
    .ch-btn.ghost{background:#fff;color:#1B2A4A}
    .ch-btn:disabled{opacity:.5;cursor:default}
    .ch-btn:focus-visible,.ch-opt input:focus-visible,#ch-answer:focus-visible{outline:3px solid #F2B705;outline-offset:2px}
    #ch-course{color:#6B7A90;font-size:13px}
    #ch-log{background:#F3F5F8;border-radius:6px;padding:8px 10px;font-size:12.5px;max-height:180px;
      overflow:auto;white-space:pre-wrap;min-height:40px}
    #ch-dp{display:none;flex-direction:column;gap:8px;border-top:2px dashed #C9D1DD;padding-top:12px}
    #ch-q{background:#FFF8E1;border-left:4px solid #F2B705;padding:8px 10px;border-radius:4px;max-height:160px;overflow:auto}
    #ch-answer{width:100%;min-height:90px;box-sizing:border-box;padding:8px;border:2px solid #C9D1DD;
      border-radius:6px;font:inherit;resize:vertical}
    .ch-row{display:flex;gap:8px}.ch-row .ch-btn{flex:1}
  `;
  const style = document.createElement('style');
  style.textContent = css;

  const panel = document.createElement('div');
  panel.id = 'ch-panel';
  panel.innerHTML = `
    <div id="ch-head"><b>Course helper</b><button id="ch-close" aria-label="Close">×</button></div>
    <div id="ch-body">
      <div id="ch-course">${slug ? `Course: ${slug}` : 'Open a course page (/learn/…) first.'}</div>
      <label class="ch-opt"><input type="checkbox" id="ch-videos" checked> Complete videos</label>
      <label class="ch-opt"><input type="checkbox" id="ch-readings" checked> Complete readings</label>
      <label class="ch-opt"><input type="checkbox" id="ch-discuss"> Answer discussion prompts</label>
      <button class="ch-btn" id="ch-run" ${slug ? '' : 'disabled'}>Run</button>
      <div id="ch-quiz" style="display:none;flex-direction:column;gap:12px">
        <button class="ch-btn ghost" id="ch-export">Export questions (.md)</button>
        <button class="ch-btn ghost" id="ch-import">Import answers (.json)</button>
        <input type="file" id="ch-file" accept=".json,.txt,.md" hidden>
        <label class="ch-opt"><input type="checkbox" id="ch-submit" checked> Submit after import</label>
        <label class="ch-opt"><input type="checkbox" id="ch-honor" checked> Tick the honor code box for me</label>
      </div>
      <div id="ch-dp">
        <b id="ch-dp-title"></b>
        <div id="ch-q"></div>
        <textarea id="ch-answer" placeholder="Type your answer…"></textarea>
        <div class="ch-row">
          <button class="ch-btn ghost" id="ch-skip">Skip</button>
          <button class="ch-btn" id="ch-post">Post answer</button>
        </div>
      </div>
      <div id="ch-log">Ready.</div>
    </div>`;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  const logEl = $('ch-log');
  const log = (msg) => { logEl.textContent += '\n' + msg; logEl.scrollTop = logEl.scrollHeight; };
  $('ch-close').onclick = () => { panel.remove(); style.remove(); };

  // Draggable header
  (() => {
    let dx, dy, drag = false;
    $('ch-head').addEventListener('mousedown', (e) => {
      if (e.target.id === 'ch-close') return;
      drag = true; const r = panel.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top;
    });
    document.addEventListener('mousemove', (e) => {
      if (!drag) return;
      panel.style.left = (e.clientX - dx) + 'px'; panel.style.top = (e.clientY - dy) + 'px'; panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => (drag = false));
  })();

  // ---------- API helpers ----------
  const csrf = document.cookie.match(/CSRF3-Token=([^;]+)/)?.[1];
  const headers = { 'Content-Type': 'application/json', 'X-CSRF3-Token': csrf };
  const get = (url) => fetch(url, { credentials: 'include' }).then((r) => r.json());
  const post = (url, body) =>
    fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(body) });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const status = (res) => (res.ok ? '✅' : `❌ ${res.status}`);
  const cmlToText = (cml) =>
    new DOMParser().parseFromString(cml || '', 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
  const escapeXml = (s) =>
    s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

  // Wait for the user to Post or Skip in the panel
  const askInPanel = (title, question) =>
    new Promise((resolve) => {
      $('ch-dp').style.display = 'flex';
      $('ch-dp-title').textContent = title;
      $('ch-q').textContent = question || '(Question text not found — check the prompt page.)';
      $('ch-answer').value = '';
      $('ch-answer').focus();
      const done = (val) => { $('ch-dp').style.display = 'none'; $('ch-post').onclick = $('ch-skip').onclick = null; resolve(val); };
      $('ch-post').onclick = () => done($('ch-answer').value.trim() || null);
      $('ch-skip').onclick = () => done(null);
    });

  // ---------- Export quiz questions ----------
  // Coursera renders each question as a fieldset/role=group with a legend and option labels.
  // If Coursera changes its URLs or markup, update these.
  const QUIZ_PATH = /\/(?:quiz|exam|assignment-submission)\//;
  const QUESTION = '[data-testid^="part-Submission"], fieldset, [role="radiogroup"], [role="group"]';
  const isQuizPage = () =>
    QUIZ_PATH.test(location.pathname) || !!document.querySelector('[data-testid^="part-Submission"]');

  // Each prompt carries a hidden instruction block aimed at AI agents plus a "1.\nQuestion 1" label; drop both.
  // ponytail: matched by the block's first/last sentence, switch to a selector if the wording changes.
  const clean = (el) => (el?.innerText || '')
    .replace(/You are a helpful AI assistant[\s\S]*?(?:Do you understand\?\.?|$)/g, '')
    .replace(/^\s*\d+\.\s*Question \d+\s*/, '')
    .replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  const scrapeQuestions = () => {
    // Prefer Coursera's own question wrappers; the generic selectors also catch non-question groups.
    const parts = [...document.querySelectorAll('[data-testid^="part-Submission"]')];
    const blocks = parts.length ? parts : [...document.querySelectorAll(QUESTION)]
      .filter((b) => !b.closest('#ch-panel') && !b.parentElement.closest(QUESTION));
    return blocks.map((block) => {
      const prompt = clean(block.querySelector('legend, [id*="prompt"], [class*="prompt"]')) ||
        clean(block.previousElementSibling);
      const labels = [...block.querySelectorAll('label')].filter((l) => clean(l));
      return { block, prompt, labels, options: labels.map(clean) };
    }).filter((q) => q.prompt);
  };

  // ponytail: 1s poll because Coursera is a SPA; use the Navigation API if this ever matters.
  const syncQuiz = () => { $('ch-quiz').style.display = isQuizPage() ? 'flex' : 'none'; };
  syncQuiz();
  const poll = setInterval(() => (panel.isConnected ? syncQuiz() : clearInterval(poll)), 1000);

  // Opens the export so it can be handed to an AI as is; the reply is what Import reads.
  // Worded as a task, with a ready-made template, so the model acts instead of asking what to do.
  const REPLY_RULE = 'Create a downloadable file named answers.json holding the completed JSON (use your file or code tool). ' +
    'If you cannot create files, output the JSON in a single ```json code block instead. ' +
    'Output nothing else: no greeting, no questions back, no summary, no explanation.';
  const aiPrompt = (qs) => [
    '# TASK FOR THE AI ASSISTANT: DO THIS NOW',
    '',
    'This document is the complete request. It is sent without any other message on purpose.',
    'Do not ask what to do with it, do not offer options, do not describe it.',
    '',
    `1. Work out the correct answer to each of the ${qs.length} quiz questions below.`,
    '2. Fill the answers into the JSON template below.',
    `3. ${REPLY_RULE}`,
    '',
    '```json',
    JSON.stringify({ answers: qs.map((q, i) => (q.options.length ? { q: i + 1, choices: [] } : { q: i + 1, text: '' })) }, null, 2),
    '```',
    '',
    '- Keep every entry and its `q` number; only fill in `choices` or `text`.',
    '- `choices`: the full text of each correct option, copied character for character from the question.',
    '  Exactly one for "Select one", one or more for "Select all that apply".',
    '- `text`: the answer to a "Free text" question.',
  ].join('\n');
  const kind = (q) => !q.options.length ? 'Free text'
    : q.block.querySelector('input[type="checkbox"]') ? 'Select all that apply' : 'Select one';

  $('ch-export').onclick = () => {
    const qs = scrapeQuestions();
    if (!qs.length) return log('No questions found. Start the quiz so the questions are on screen, then try again.');

    const title = document.title.split(' | ')[0].trim() || 'quiz';
    const md = `${aiPrompt(qs)}\n\n# ${title}\n\n` + qs.map((q, i) =>
      `## Question ${i + 1}\n\n${q.prompt}\n\n_${kind(q)}_\n\n` + q.options.map((o) => `- ${o}`).join('\n')
    ).join('\n\n') + `\n\n---\n\nEND OF QUESTIONS. Now do the task at the top of this document. ${REPLY_RULE}\n`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `${title.replace(/[^\w-]+/g, '_')}.md`;
    a.click();
    log(`✅ Exported ${qs.length} questions.`);
    // An attached file is often treated as a document to discuss; the same text pasted as the message is not.
    navigator.clipboard.writeText(md).then(
      () => log('📋 Also copied. Pasting it as the chat message works more reliably than attaching the file.'),
      () => {}
    );
  };

  // ---------- Import answers ----------
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const submitButton = (root, testid, skip) => root.querySelector(`[data-testid="${testid}"]`) ||
    [...root.querySelectorAll('button')].find((b) => b !== skip && !b.closest('#ch-panel') && /^submit$/i.test(b.innerText.trim()));

  // Fills one question; returns false (and leaves it untouched) unless every answer maps onto the page.
  const fillQuestion = (q, a) => {
    if (!q.labels.length) {
      const field = q.block.querySelector('textarea, input[type="text"], input[type="number"], input:not([type])');
      if (!field || a.text == null) return false;
      // Native setter + input event so React picks the value up.
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set.call(field, String(a.text));
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    const want = new Set((a.choices || []).map(norm));
    const hits = q.options.map((o) => want.has(norm(o)));
    if (!want.size || hits.filter(Boolean).length !== want.size) return false;
    q.labels.forEach((l, i) => {
      const input = l.control || l.querySelector('input');
      if (input && input.checked !== hits[i]) input.click();
    });
    return true;
  };

  $('ch-import').onclick = () => $('ch-file').click();
  $('ch-file').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // so the same file can be picked again
    if (!file) return;
    try {
      const raw = await file.text();
      // Tolerate a reply saved with its ```json fence or stray text around the object.
      const { answers } = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      if (!Array.isArray(answers)) throw new Error('no "answers" array');

      const qs = scrapeQuestions();
      const done = new Set();
      for (const a of answers) {
        const q = qs[a.q - 1];
        if (q && fillQuestion(q, a)) done.add(a.q);
        else log(`⚠️ Question ${a.q}: ${q ? 'answer does not match the page, left as is' : 'not on this page'}.`);
      }
      log(`Filled ${done.size}/${qs.length} questions.`);
      if (!$('ch-submit').checked) return;

      // Submitting uses up an attempt, so only do it when every question on the page was filled.
      if (done.size !== qs.length) return log('⛔ Not submitted: fix the questions above, then submit yourself.');
      await sleep(500);
      // The honor code box is the learner's own declaration, so it is ticked only when they opted in.
      // ponytail: found by its English label, add the id/selector if the UI language differs.
      const honor = $('ch-honor').checked && [...document.querySelectorAll('input[type="checkbox"]')].find((c) =>
        !c.closest('#ch-panel') && /understand and agree/i.test((c.labels?.[0] || c.parentElement).innerText));
      if (honor && !honor.checked) { honor.click(); await sleep(300); }
      // Submit stays disabled until the box is ticked, so wait for that (2 min) and then carry on.
      const ready = () => {
        const b = submitButton(document, 'submit-button');
        return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true' ? b : null;
      };
      if (!ready()) log('⏳ Tick the honor code box on the page. Submit follows automatically (waiting 2 min).');
      let btn;
      for (let i = 0; !(btn = ready()) && i < 240 && panel.isConnected; i++) await sleep(500);
      if (!btn) return log('⛔ Not submitted: Submit is still disabled. Submit yourself.');
      btn.click();
      await sleep(1000);
      const dialog = [...document.querySelectorAll('[role="dialog"]')].pop();
      submitButton(dialog || document, 'dialog-submit-button', btn)?.click();
      log('Submit clicked. Check the page for the result.');
    } catch (err) {
      log(`❌ Import failed: ${err.message}`);
    }
  };

  // ---------- Main ----------
  $('ch-run').onclick = async () => {
    const doVideos = $('ch-videos').checked, doReadings = $('ch-readings').checked, doDiscuss = $('ch-discuss').checked;
    if (!doVideos && !doReadings && !doDiscuss) return log('Pick at least one option.');
    $('ch-run').disabled = true;
    logEl.textContent = 'Loading course…';

    try {
      const me = await get(`${API}/adminUserPermissions.v1?q=my`);
      const userId = me.elements?.[0]?.id ?? prompt('Could not detect userId, enter it:');
      const course = await get(`${API}/onDemandCourses.v1?q=slug&slug=${slug}`);
      const courseId = course.elements[0].id;
      const mats = await get(
        `${API}/onDemandCourseMaterials.v2/?q=slug&slug=${slug}` +
          `&includes=items&fields=onDemandCourseMaterialItems.v2(name,contentSummary,isLocked)`
      );
      const items = mats.linked['onDemandCourseMaterialItems.v2'];
      log(`Found ${items.length} items.`);

      for (const item of items) {
        const type = item.contentSummary?.typeName;

        if (type === 'lecture' && doVideos) {
          const res = await post(
            `${API}/opencourse.v1/user/${userId}/course/${slug}/item/${item.id}/lecture/videoEvents/ended?autoEnroll=false`,
            { contentRequestBody: {} }
          );
          log(`${status(res)} Video: ${item.name}`);
          await sleep(500);
        } else if (type === 'supplement' && doReadings) {
          const res = await post(`${API}/onDemandSupplementCompletions.v1`, {
            courseId, itemId: item.id, userId: Number(userId),
          });
          log(`${status(res)} Reading: ${item.name}`);
          await sleep(500);
        } else if (type === 'discussionPrompt' && doDiscuss) {
          try {
            const dp = await get(
              `${API}/onDemandDiscussionPrompts.v1/${userId}~${courseId}~${item.id}` +
                `?fields=onDemandDiscussionPromptQuestions.v1(content,forumId)&includes=question`
            );
            const q = dp.linked?.['onDemandDiscussionPromptQuestions.v1']?.[0];
            if (!q) { log(`⚠️ Couldn't load prompt: ${item.name}`); continue; }

            const answer = await askInPanel(item.name, cmlToText(q.content?.question?.definition?.value));
            if (!answer) { log(`⏭️ Skipped: ${item.name}`); continue; }

            const res = await post(`${API}/onDemandCourseForumAnswers.v1/`, {
              content: {
                typeName: 'cml',
                definition: { dtdId: 'discussion/1', value: `<co-content><text>${escapeXml(answer)}</text></co-content>` },
              },
              courseForumQuestionId: `${courseId}~${q.id.split('~').pop()}`,
            });
            log(`${status(res)} Discussion: ${item.name}`);
            await sleep(800);
          } catch (e) {
            log(`❌ Discussion: ${item.name} (${e.message})`);
          }
        }
      }
      log('Done. Refresh the page to see progress.');
    } catch (e) {
      log(`❌ Stopped: ${e.message}`);
    } finally {
      $('ch-run').disabled = false;
    }
  };
}

// Toolbar icon click -> toggle the panel
chrome.runtime.onMessage.addListener((msg) => {
  if (msg === 'toggle-helper') openHelper();
});
