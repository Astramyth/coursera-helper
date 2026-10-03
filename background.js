const FILES = ['quiz.js', 'content.js'];

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.startsWith('https://www.coursera.org/learn/')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, 'toggle-helper');
  } catch {
    // Content script not loaded yet (tab opened before install) -> inject then toggle
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
    await chrome.tabs.sendMessage(tab.id, 'toggle-helper');
  }
});

// Quiz batch. The worker keeps no state of its own: the queue lives in chrome.storage and is driven by
// the content script in the work tab, so the batch carries on when this worker is stopped and restarted.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.t === 'chq-whoami') reply(sender.tab?.id);
  else if (msg?.t === 'chq-download') {
    chrome.downloads.download({
      url: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(msg.md),
      filename: 'quizzes.md',
      conflictAction: 'uniquify',
    }).then((downloadId) => reply({ downloadId }), (error) => reply({ error: error.message }));
    return true;
  } else if (msg?.t === 'chq-start') {
    // One work tab for the whole batch. Its id is stored before it loads the first quiz.
    (async () => {
      const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
      await chrome.storage.local.set({ chqStop: false, chq: { ...msg.state, workTabId: tab.id } });
      await chrome.tabs.update(tab.id, { url: msg.url });
      reply(tab.id);
    })().catch((error) => reply({ error: error.message }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { chq } = await chrome.storage.local.get('chq');
  if (!chq?.running || chq.workTabId !== tabId) return;
  chq.running = false;
  chq.log.push('🛑 The work tab was closed. Batch stopped.');
  await chrome.storage.local.set({ chq });
});
