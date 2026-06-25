document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');
  const messageP = document.getElementById('message');

  // Check if we have the token
  const { auth_token } = await chrome.storage.local.get('auth_token');

  if (auth_token) {
    loginBtn.style.display = 'none';
    messageP.style.display = 'none';
    statusDiv.style.display = 'block';
  } else {
    // Try to extract it instantly in case they are already logged in
    chrome.runtime.sendMessage({ type: 'SYNC_AUTH' }, async (response) => {
      if (response && response.success) {
        loginBtn.style.display = 'none';
        messageP.style.display = 'none';
        statusDiv.style.display = 'block';
      }
    });
  }

  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5174' });
  });
});
