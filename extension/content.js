// 1. Inject the Container
const root = document.createElement('div');
root.id = 'lasminai-ext-root';
document.documentElement.appendChild(root);

// 2. Build the Voice Assistant UI
const micBtn = document.createElement('div');
micBtn.className = 'lasminai-mic-btn';
micBtn.innerHTML = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" x2="12" y1="19" y2="22"></line>
  </svg>
`;

const bubble = document.createElement('div');
bubble.className = 'lasminai-bubble';
bubble.innerHTML = `
  <div class="lasminai-bubble-header">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    LasMin Voice <span id="lasminai-status-text" style="color: #9ca3af; font-weight: 400; margin-left: 4px;"></span>
  </div>
  <div class="lasminai-bubble-content" id="lasminai-transcript"></div>
`;

root.appendChild(bubble);
root.appendChild(micBtn);

// 3. Speech Recognition Logic
let recognition = null;
let isListening = false;
let isProcessing = false;
let currentTranscript = "";
let silenceTimer = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    // Clear the silence timer because the user is still talking
    if (silenceTimer) clearTimeout(silenceTimer);

    let interimTranscript = '';
    let newlyFinal = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        newlyFinal += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (newlyFinal) {
      currentTranscript += newlyFinal + ' ';
    }
    
    document.getElementById('lasminai-transcript').innerText = currentTranscript + interimTranscript;

    // Start a 2-second silence timer. If they don't speak for 2 seconds, auto-submit.
    silenceTimer = setTimeout(() => {
      if (isListening) recognition.stop();
    }, 2000);
  };

  recognition.onend = () => {
    if (isProcessing) return;
    if (currentTranscript.trim()) {
      processVoiceCommand(currentTranscript.trim());
    } else {
      setListeningState(false);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') {
      return; // Ignore benign errors caused by manual stop or silence
    }
    console.warn("Speech Recognition Warning:", event.error);
    document.getElementById('lasminai-transcript').innerText = "Mic Error: " + event.error;
    setTimeout(() => setListeningState(false), 2000);
  };
}

function setListeningState(listening) {
  isListening = listening;
  if (silenceTimer) clearTimeout(silenceTimer);
  
  if (listening) {
    currentTranscript = "";
    micBtn.classList.add('listening');
    bubble.classList.add('visible');
    document.getElementById('lasminai-status-text').innerText = '(Listening...)';
    document.getElementById('lasminai-transcript').innerText = '...';
    try { recognition?.start(); } catch(e) {}
  } else {
    micBtn.classList.remove('listening');
    if (!isProcessing) {
      bubble.classList.remove('visible');
    }
    recognition?.stop();
  }
}

micBtn.addEventListener('click', () => {
  if (isListening) {
    recognition?.stop(); // will trigger onend
  } else {
    setListeningState(true);
  }
});

function simpleMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  html = html.replace(/(?:<br>|^)- (.*?)(?=<br>|$)/g, '<li>$1</li>');
  return html;
}

async function processVoiceCommand(commandText) {
  if (isProcessing) return;
  isProcessing = true;
  
  setListeningState(false);
  micBtn.classList.add('processing');
  document.getElementById('lasminai-status-text').innerText = '(Thinking...)';

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });

  chrome.runtime.sendMessage({
    type: 'PROXY_FETCH',
    url: '/api/voice/process',
    method: 'POST',
    body: {
      message: commandText,
      userTimezone,
      localTime
    }
  }, (response) => {
    if (response && response.success) {
      if (response.data.success === false) {
        document.getElementById('lasminai-transcript').innerText = "API Error: " + (response.data.error || response.data.message || "Something went wrong.");
        resetState();
        return;
      }

      document.getElementById('lasminai-transcript').innerHTML = simpleMarkdown(response.data.reply);
      document.getElementById('lasminai-status-text').innerText = '';
      
      const textToSpeak = response.data.replyVoice || response.data.reply;
      if (textToSpeak) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // macOS/Chrome bug: Sometimes onend is dropped. Force reset after 15s.
        const fallbackTimeout = setTimeout(() => {
          if (isProcessing) resetState();
        }, 15000);

        utterance.onend = () => {
          clearTimeout(fallbackTimeout);
          resetState();
        };
        utterance.onerror = () => {
          clearTimeout(fallbackTimeout);
          resetState();
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        resetState();
      }
    } else {
      document.getElementById('lasminai-transcript').innerText = "Error: " + (response?.error || "Failed to connect.");
      resetState();
    }
  });
}

function resetState() {
  isProcessing = false;
  micBtn.classList.remove('processing');
  setTimeout(() => {
    if (!isListening && !isProcessing) bubble.classList.remove('visible');
  }, 5000);
}

// 4. Reminder Blocker Logic
const blockerOverlay = document.createElement('div');
blockerOverlay.className = 'lasminai-blocker-overlay';
blockerOverlay.innerHTML = `
  <div class="lasminai-blocker-box">
    <!-- Glowing background orb behind the icon -->
    <div class="lasminai-blocker-glow"></div>

    <div class="lasminai-blocker-icon-container">
      <svg class="lasminai-blocker-icon" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
      </svg>
    </div>
    <h2 class="lasminai-blocker-heading">Reminder!</h2>
    <p class="lasminai-blocker-title" id="lasminai-blocker-title">Time to Drink Water</p>
    
    <div class="lasminai-blocker-actions">
      <button class="lasminai-blocker-btn lasminai-btn-dismiss" id="lasminai-btn-dismiss">Dismiss</button>
      <button class="lasminai-blocker-btn lasminai-btn-snooze" id="lasminai-btn-snooze">Snooze (10m)</button>
    </div>
  </div>
`;
root.appendChild(blockerOverlay);

let activeReminderId = null;

// 4. Listen for Blocker commands from Background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_BLOCKER' && message.reminders && message.reminders.length > 0) {
    if (window.location.href.includes('localhost:5174') || window.location.href.includes('localhost:5050') || window.location.href.includes('lasminai.vercel.app')) {
      return; // Do not show the raw extension blocker over the beautiful native web app dialog
    }
    const r = message.reminders[0];
    activeReminderId = r._id;
    document.getElementById('lasminai-blocker-title').innerText = r.title;
    blockerOverlay.classList.add('visible');
  }
});

// 5. Listen for Instant-Sync from Web App
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'LASMIN_REMINDER_DUE') {
    chrome.runtime.sendMessage({ type: 'BROADCAST_BLOCKER', reminders: event.data.reminders });
  }
});

document.getElementById('lasminai-btn-dismiss').addEventListener('click', () => {
  if (!activeReminderId) return;
  chrome.runtime.sendMessage({
    type: 'PROXY_FETCH',
    url: `/api/reminders/${activeReminderId}/status`,
    method: 'PUT',
    body: { status: 'dismissed' }
  }, () => {
    blockerOverlay.classList.remove('visible');
    activeReminderId = null;
  });
});

document.getElementById('lasminai-btn-snooze').addEventListener('click', () => {
  if (!activeReminderId) return;
  // Snooze for 10 mins
  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + 10);
  
  chrome.runtime.sendMessage({
    type: 'PROXY_FETCH',
    url: `/api/reminders/${activeReminderId}/snooze`,
    method: 'PUT',
    body: { remindAt: snoozeTime.toISOString() }
  }, () => {
    blockerOverlay.classList.remove('visible');
    activeReminderId = null;
  });
});
