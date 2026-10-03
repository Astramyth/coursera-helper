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
    #ch-log .ch-ok{margin:10px 0;color:#1F8A70;font-weight:600}
    #ch-log .ch-big{margin:10px 0;font-size:15px;font-weight:700;color:#1F5FBF}
    #ch-log .ch-end{color:#1F8A70}
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
    <div id="ch-head"><b>Course helper · v2</b><button id="ch-close" aria-label="Close">×</button></div>
    <div id="ch-body">
      <div id="ch-course">${slug ? `Course: ${slug}` : 'Open a course page (/learn/…) first.'}</div>
      <label class="ch-opt"><input type="checkbox" id="ch-videos" checked> Complete videos</label>
      <label class="ch-opt"><input type="checkbox" id="ch-readings" checked> Complete readings</label>
      <label class="ch-opt"><input type="checkbox" id="ch-practice"> Scan all unfinished quizzes → .md</label>
      <label class="ch-opt"><input type="checkbox" id="ch-discuss"> Answer discussion prompts</label>
      <div class="ch-row">
        <button class="ch-btn" id="ch-run" ${slug ? '' : 'disabled'}>Run</button>
        <button class="ch-btn ghost" id="ch-stop">Stop</button>
      </div>
      <button class="ch-btn ghost" id="ch-export" style="display:none">Export this quiz (.md)</button>
      <button class="ch-btn ghost" id="ch-import">Import all quiz answers (.json)</button>
      <input type="file" id="ch-file" accept=".json,.txt,.md" hidden>
      <label class="ch-opt"><input type="checkbox" id="ch-submit" checked> Submit after import</label>
      <label class="ch-opt"><input type="checkbox" id="ch-honor"> Tick acknowledgment / honor code boxes</label>
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
  // One element per line: headline lines (scan, summary, end) are large and coloured, and each
  // successful export or submit stands apart from its neighbours.
  const log = (msg) => {
    const line = document.createElement('div');
    line.textContent = msg;
    line.className = /^🏁/u.test(msg) ? 'ch-big ch-end' : /^(📊|🛑)/u.test(msg) ? 'ch-big'
      : /^\[(exported|submitted|verified-complete)\]/.test(msg) ? 'ch-ok' : '';
    logEl.append(line);
    logEl.scrollTop = logEl.scrollHeight;
  };
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

  // ---------- Quiz scanning and answer import (logic in quiz.js) ----------
  // Quiz URLs only show the export control; quiz.js checks progress before export and type before import.
  // ponytail: 1s poll because Coursera is a SPA; use the Navigation API if this ever matters.
  const syncQuiz = () => { $('ch-export').style.display = CHQ.itemIdFromUrl() ? '' : 'none'; };
  syncQuiz();
  const poll = setInterval(() => (panel.isConnected ? syncQuiz() : clearInterval(poll)), 1000);

  // The batch runs in a separate work tab and writes its log to chrome.storage; mirror it here.
  let shown = { id: null, n: 0 };
  const showBatch = (st) => {
    if (!st) return;
    if (st.runId !== shown.id) shown = { id: st.runId, n: 0 };
    st.log.slice(shown.n).forEach(log);
    shown.n = st.log.length;
  };
  const onStore = (changes) => {
    if (!panel.isConnected) return chrome.storage.onChanged.removeListener(onStore);
    if (changes.chq) showBatch(changes.chq.newValue);
  };
  chrome.storage.onChanged.addListener(onStore);
  chrome.storage.local.get('chq').then(({ chq }) => chq?.running && showBatch(chq));

  let halt = false;
  $('ch-stop').onclick = () => {
    halt = true;
    chrome.storage.local.set({ chqStop: true });
    log('🛑 Stop requested. Nothing further will be started, filled or submitted.');
  };

  $('ch-export').onclick = async () => {
    try {
      const md = await CHQ.exportCurrent(slug, log);
      // An attached file is often treated as a document to discuss; the same text pasted as the message is not.
      if (md) await navigator.clipboard.writeText(md).then(() => log('📋 Also copied to the clipboard.'), () => {});
    } catch (err) {
      log(`❌ Export failed: ${err.message}`);
    }
  };

  // Off until the learner turns it on; the choice is remembered so it is not silently lost on reload.
  chrome.storage.local.get('chHonor').then(({ chHonor }) => { $('ch-honor').checked = !!chHonor; });
  $('ch-honor').onchange = (e) => chrome.storage.local.set({ chHonor: e.target.checked });

  $('ch-import').onclick = () => $('ch-file').click();
  $('ch-file').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // so the same file can be picked again
    if (!file) return;
    try {
      await CHQ.startImport(await file.text(), { submit: $('ch-submit').checked, honor: $('ch-honor').checked }, log);
    } catch (err) {
      log(`❌ Import failed: ${err.message}`);
    }
  };

  // ---------- Main ----------
  $('ch-run').onclick = async () => {
    const doVideos = $('ch-videos').checked, doReadings = $('ch-readings').checked, doDiscuss = $('ch-discuss').checked;
    const doPractice = $('ch-practice').checked;
    if (!doVideos && !doReadings && !doDiscuss && !doPractice) return log('Pick at least one option.');
    halt = false;
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
      // Scan & Export first: it runs on its own in the work tab (quiz.js opens all unfinished assessment
      // candidates, including graded quizzes), so it must not wait behind the discussion prompts below.
      if (doPractice) await CHQ.startExport(slug, log);

      for (const item of items) {
        if (halt) break;
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
      log(halt ? '🛑 Stopped.' : 'Done. Refresh the page to see progress.');
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
