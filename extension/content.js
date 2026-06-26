const isLasMinWebApp = window.location.href.includes('localhost:5174') || window.location.href.includes('localhost:5050') || window.location.href.includes('lasminai.vercel.app');

// 1. Inject the Container
const root = document.createElement('div');
root.id = 'lasminai-ext-root';
if (isLasMinWebApp) {
  root.style.display = 'none';
}
document.documentElement.appendChild(root);
const safeSendMessage = (msg, callback) => {
  if (!chrome.runtime?.id) {
    return;
  }
  try {
    chrome.runtime.sendMessage(msg, callback);
  } catch(e) {
  }
};

// 2. Build the Voice Assistant UI
const widgetContainer = document.createElement('div');
widgetContainer.className = 'lasminai-widget-container';

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

widgetContainer.appendChild(bubble);
widgetContainer.appendChild(micBtn);
root.appendChild(widgetContainer);

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
    if (event.error === 'aborted' || event.error === 'no-speech' || event.error === 'not-allowed') {
      return; // Ignore benign errors caused by manual stop, silence, or mic blocking
    }
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

let isDragging = false;
let startX, startY, initialX, initialY;

micBtn.addEventListener('mousedown', (e) => {
  isDragging = false;
  startX = e.clientX;
  startY = e.clientY;
  const rect = widgetContainer.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  function onMouseMove(moveEvent) {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    // Threshold to prevent micro-movements from counting as drags
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging = true;
      widgetContainer.style.right = 'auto'; 
      widgetContainer.style.bottom = 'auto'; 
      widgetContainer.style.left = `${initialX + dx}px`;
      widgetContainer.style.top = `${initialY + dy}px`;
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

micBtn.addEventListener('click', (e) => {
  if (isDragging) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
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

  safeSendMessage({
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
      <button class="lasminai-blocker-btn lasminai-btn-snooze" id="lasminai-btn-snooze">Snooze</button>
    </div>
  </div>
`;
root.appendChild(blockerOverlay);

let activeReminderId = null;
let mathChallenge = null;

const generateMathProblem = () => {
  const types = ['add', 'sub', 'square'];
  const type = types[Math.floor(Math.random() * types.length)];
  if (type === 'add') {
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
    return { text: `${a} + ${b} = ?`, answer: a + b };
  } else if (type === 'sub') {
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
    const max = Math.max(a, b);
    const min = Math.min(a, b);
    return { text: `${max} - ${min} = ?`, answer: max - min };
  } else {
    const a = Math.floor(Math.random() * 21) + 5;
    return { text: `${a}² = ?`, answer: a * a };
  }
};



// 4. Listen for Blocker commands from Background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_BLOCKER' && message.reminders && message.reminders.length > 0) {
    if (window.location.href.includes('localhost:5174') || window.location.href.includes('localhost:5050') || window.location.href.includes('lasminai.vercel.app')) {
      return; // Do not show the raw extension blocker over the beautiful native web app dialog
    }
    const r = message.reminders[0];
    activeReminderId = r._id;
    
    // Reset math UI if it was previously open
    mathChallenge = null;
    btnDismiss.style.display = 'block';
    btnSnooze.style.display = 'block';
    const mt = document.getElementById('lasminai-math-text');
    const mi = document.getElementById('lasminai-math-input');
    if (mt) mt.remove();
    if (mi) mi.remove();

    document.getElementById('lasminai-blocker-title').innerText = r.title;
    blockerOverlay.classList.add('visible');
  } else if (message.type === 'HIDE_BLOCKER') {
    if (activeReminderId === message.reminderId) {
      blockerOverlay.classList.remove('visible');
      activeReminderId = null;
      // Reset UI
      mathChallenge = null;
      btnDismiss.style.display = 'block';
      btnSnooze.style.display = 'block';
      const mt = document.getElementById('lasminai-math-text');
      const mi = document.getElementById('lasminai-math-input');
      if (mt) mt.remove();
      if (mi) mi.remove();
    }
  }
});

// 5. Listen for Instant-Sync from Web App
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'LASMIN_REMINDER_DUE') {
    safeSendMessage({ type: 'BROADCAST_BLOCKER', reminders: event.data.reminders });
  }
});

const btnDismiss = document.getElementById('lasminai-btn-dismiss');
const btnSnooze = document.getElementById('lasminai-btn-snooze');
const actionsDiv = document.querySelector('.lasminai-blocker-actions');

// When dismissing
btnDismiss.addEventListener('click', () => {
  if (!activeReminderId) return;

  if (!mathChallenge) {
    mathChallenge = generateMathProblem();
    
    // Morph UI
    btnDismiss.style.display = 'none';
    btnSnooze.style.display = 'none';
    
    const mathText = document.createElement('div');
    mathText.className = 'lasminai-blocker-btn';
    mathText.style.backgroundColor = '#f3f4f6';
    mathText.style.color = '#1f2937';
    mathText.style.cursor = 'default';
    mathText.innerText = mathChallenge.text;
    mathText.id = 'lasminai-math-text';
    
    const mathInput = document.createElement('input');
    mathInput.type = 'number';
    mathInput.className = 'lasminai-blocker-btn';
    mathInput.style.backgroundColor = 'white';
    mathInput.style.color = 'black';
    mathInput.style.border = '2px solid #ef4444';
    mathInput.placeholder = 'Answer...';
    mathInput.id = 'lasminai-math-input';
    
    mathInput.addEventListener('input', (e) => {
      if (e.target.value.trim() === mathChallenge.answer.toString()) {
        const idToDismiss = activeReminderId;
        // Instantly hide and sync visually
        safeSendMessage({ type: 'HIDE_BLOCKER', reminderId: idToDismiss });
        blockerOverlay.classList.remove('visible');
        activeReminderId = null;
        mathChallenge = null;
        
        // Reset UI
        btnDismiss.style.display = 'block';
        btnSnooze.style.display = 'block';
        mathText.remove();
        mathInput.remove();

        // Perform backend fetch via proxy
        safeSendMessage({
          type: 'PROXY_FETCH',
          url: `/api/reminders/${idToDismiss}/status`,
          method: 'PUT',
          body: { status: 'dismissed' }
        }, () => {});
      }
    });

    actionsDiv.appendChild(mathText);
    actionsDiv.appendChild(mathInput);
    mathInput.focus();
  }
});

btnSnooze.addEventListener('click', () => {
  if (!activeReminderId) return;
  const idToSnooze = activeReminderId;
  
  // Snooze for 5 mins
  const snoozeTime = new Date();
  snoozeTime.setMinutes(snoozeTime.getMinutes() + 5);
  
  // Instantly hide and sync visually
  safeSendMessage({ type: 'HIDE_BLOCKER', reminderId: idToSnooze });
  blockerOverlay.classList.remove('visible');
  activeReminderId = null;
  
  // Clean up if they hit snooze while math was open somehow (though button is hidden)
  if (mathChallenge) {
    mathChallenge = null;
    btnDismiss.style.display = 'block';
    btnSnooze.style.display = 'block';
    const mt = document.getElementById('lasminai-math-text');
    const mi = document.getElementById('lasminai-math-input');
    if (mt) mt.remove();
    if (mi) mi.remove();
  }

  // Perform backend fetch via proxy
  safeSendMessage({
    type: 'PROXY_FETCH',
    url: `/api/reminders/${idToSnooze}/snooze`,
    method: 'PUT',
    body: { remindAt: snoozeTime.toISOString() }
  }, () => {});
});

// 6. Form Autofill Logic
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRIGGER_AUTOFILL') {
    handleAutofill();
  }
});

async function handleAutofill() {
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
  if (inputs.length === 0) {
    alert("LasMinAI: No fillable form fields found on this page.");
    return;
  }

  const formSchema = inputs.map(el => {
    let labelText = '';
    if (el.labels && el.labels.length > 0) {
      labelText = el.labels[0].innerText;
    } else if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) labelText = label.innerText;
    }

    let options = [];
    if (el.tagName.toLowerCase() === 'select') {
      options = Array.from(el.options).map(opt => opt.value).filter(val => val !== '');
    }

    return {
      id: el.id || '',
      name: el.name || '',
      type: el.type || el.tagName.toLowerCase(),
      placeholder: el.placeholder || '',
      label: labelText.trim(),
      ...(options.length > 0 && { options })
    };
  }).filter(field => field.id || field.name || field.label);

  if (formSchema.length === 0) {
    alert("LasMinAI: Form fields do not have proper IDs/Names to map.");
    return;
  }

  // Show a loading toast
  const toast = document.createElement('div');
  toast.innerText = "LasMinAI is analyzing the form...";
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 20px';
  toast.style.background = '#3b82f6';
  toast.style.color = 'white';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '999999';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  document.body.appendChild(toast);

  safeSendMessage({
    type: 'PROXY_FETCH',
    url: '/api/autofill/process',
    method: 'POST',
    body: { formSchema }
  }, (response) => {
    if (response && response.success && response.data && response.data.data) {
      const fieldData = response.data.data;
      let filledCount = 0;
      
      inputs.forEach(el => {
        const keyMatch = fieldData[el.id] || fieldData[el.name];
        if (keyMatch) {
          el.value = keyMatch;
          filledCount++;
          // Dispatch events for React/Vue bindings
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      toast.innerText = `Autofill Complete! Filled ${filledCount} fields.`;
      toast.style.background = '#22c55e';
    } else {
      toast.innerText = "Autofill Failed: " + (response?.error || response?.data?.message || "Unknown error");
      toast.style.background = '#ef4444';
    }
    
    setTimeout(() => toast.remove(), 4000);
  });
}
