chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.startsWith('https://www.coursera.org/learn/')) return;
  try {
    await chrome.tabs.sendMessage(tab.id, 'toggle-helper');
  } catch {
    // Content script not loaded yet (tab opened before install) -> inject then toggle
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, 'toggle-helper');
  }
});
