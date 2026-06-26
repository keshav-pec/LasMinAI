document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');
  const unauthContainer = document.getElementById('unauthContainer');
  
  const currentDomainP = document.getElementById('currentDomain');
  const voiceToggle = document.getElementById('voiceToggle');
  const remindersToggle = document.getElementById('remindersToggle');

  let currentHostname = '';

  // Get current tab hostname
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs && tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentHostname = url.hostname;
        currentDomainP.innerText = currentHostname;
        
        // Fetch exclusion list
        const { siteSettings = {} } = await chrome.storage.sync.get('siteSettings');
        const settings = siteSettings[currentHostname] || { voice: true, reminders: true };
        
        voiceToggle.checked = settings.voice;
        remindersToggle.checked = settings.reminders;
      } catch (e) {
        currentDomainP.innerText = "Cannot read this site";
        voiceToggle.disabled = true;
        remindersToggle.disabled = true;
      }
    }
  });

  const saveSettings = async () => {
    if (!currentHostname) return;
    const { siteSettings = {} } = await chrome.storage.sync.get('siteSettings');
    
    siteSettings[currentHostname] = {
      voice: voiceToggle.checked,
      reminders: remindersToggle.checked
    };
    
    await chrome.storage.sync.set({ siteSettings });
    // Reload the active tab to apply changes immediately
    chrome.tabs.reload();
  };

  voiceToggle.addEventListener('change', saveSettings);
  remindersToggle.addEventListener('change', saveSettings);

  // Try to extract it instantly in case they are already logged in via web app
  chrome.runtime.sendMessage({ type: 'SYNC_AUTH' }, (response) => {
    if (response && response.success) {
      unauthContainer.style.display = 'none';
      statusDiv.style.display = 'block';
    } else {
      unauthContainer.style.display = 'block';
      statusDiv.style.display = 'none';
    }
  });

  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5174' });
  });
});
