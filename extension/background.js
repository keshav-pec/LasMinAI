const ENV = 'prod'; // Change to 'dev' when developing locally

const API_URL = ENV === 'dev' ? 'http://localhost:5050' : 'https://lasminai-280275748399.asia-south1.run.app';
const FRONTEND_URL = ENV === 'dev' ? 'http://localhost:5174' : 'https://lasmin-ai-280275748399.asia-south1.run.app';
const PROD_FRONTEND_URL = 'https://lasmin-ai-280275748399.asia-south1.run.app';

// 1. Setup Context Menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lasminai-autofill',
    title: 'Auto-fill form with LasMinAI',
    contexts: ['page', 'editable']
  });
  chrome.contextMenus.create({
    id: 'lasminai-extract-tasks',
    title: 'Extract tasks with LasMinAI',
    contexts: ['page', 'selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'lasminai-autofill' && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTOFILL' }).catch(() => {});
  }
  if (info.menuItemId === 'lasminai-extract-tasks' && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_EXTRACT_TASKS' }).catch(() => {});
  }
});

// 2. Setup Auth Syncing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_AUTH') {
    (async () => {
      // Try to extract the cookie from the frontend or API domain
      let cookie = await chrome.cookies.get({ url: FRONTEND_URL, name: 'auth_token' });
      if (!cookie) cookie = await chrome.cookies.get({ url: API_URL, name: 'auth_token' });
      
      if (cookie && cookie.value) {
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    })();
    return true; // Keep the channel open for async response
  }

  // 1. Instant-Sync from Web App
  if (message.type === 'BROADCAST_BLOCKER') {
    (async () => {
      const tabs = await chrome.tabs.query({ url: "*://*/*" });
      for (const tab of tabs) {
        // Skip the web app itself (it handles its own UI)
        if (tab.url.startsWith(FRONTEND_URL) || tab.url.startsWith(PROD_FRONTEND_URL)) continue;

        chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_BLOCKER',
          reminders: message.reminders
        }).catch(() => {});
      }
    })();
    return true; // async
  }

  // 2. Broadcast HIDE_BLOCKER across all tabs instantly
  if (message.type === 'HIDE_BLOCKER') {
    (async () => {
      const tabs = await chrome.tabs.query({ url: "*://*/*" });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'HIDE_BLOCKER',
          reminderId: message.reminderId
        }).catch(() => {});
      }
    })();
    return true; // async
  }

  // 3. Proxy Fetch Requests to bypass CORS for content scripts
  if (message.type === 'PROXY_FETCH') {
    (async () => {
      let cookie = await chrome.cookies.get({ url: FRONTEND_URL, name: 'auth_token' });
      if (!cookie) cookie = await chrome.cookies.get({ url: API_URL, name: 'auth_token' });
      
      if (!cookie || !cookie.value) {
        return sendResponse({ success: false, error: 'Not authenticated' });
      }
      const auth_token = cookie.value;

      try {
        const response = await fetch(API_URL + message.url, {
          method: message.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_token}`,
            ...(message.headers || {})
          },
          body: message.body ? JSON.stringify(message.body) : undefined
        });

        const data = await response.json();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep the channel open
  }
});

// 3. Poll Reminders
async function pollReminders() {
  let cookie = await chrome.cookies.get({ url: FRONTEND_URL, name: 'auth_token' });
  if (!cookie) cookie = await chrome.cookies.get({ url: API_URL, name: 'auth_token' });
  
  if (!cookie || !cookie.value) return;
  const auth_token = cookie.value;

  try {
    const response = await fetch(`${API_URL}/api/reminders/active`, {
      headers: { 'Authorization': `Bearer ${auth_token}` }
    });
    let resData;
    const text = await response.text();
    try {
      resData = JSON.parse(text);
    } catch (e) {
      console.warn("Non-JSON response from API:", text.substring(0, 100));
      return;
    }

    if (resData.success && resData.data && resData.data.length > 0) {
      // Find overdue reminders (remindAt <= now)
      const now = new Date();
      const dueReminders = resData.data.filter(r => new Date(r.remindAt) <= now);

      if (dueReminders.length > 0) {
        // Broadcast to all tabs to show the blocking UI
        const tabs = await chrome.tabs.query({ url: "*://*/*" });
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_BLOCKER',
            reminders: dueReminders
          }).catch(() => {}); // Ignore tabs where content script isn't loaded
        }
      }
    }
  } catch (err) {
    if (err.message.includes('Failed to fetch')) {
      console.warn("LasMinAI: Backend unreachable. Will retry polling later.");
    } else {
      console.error("Failed to poll reminders", err);
    }
  }
}

chrome.alarms.create('pollReminders', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pollReminders') {
    pollReminders();
  }
});

// Run once immediately when the service worker wakes up
pollReminders();
