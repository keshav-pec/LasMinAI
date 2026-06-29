let siteSettings = { voice: true, reminders: true };

chrome.storage.sync.get('siteSettings', ({ siteSettings: storedSettings = {} }) => {
  const host = window.location.hostname;
  siteSettings = storedSettings[host] || { voice: true, reminders: true };

  // If BOTH are disabled, we don't need to do anything at all.
  if (!siteSettings.voice && !siteSettings.reminders) {
    return; 
  }

  const isLasMinWebApp = window.location.href.includes('localhost:5174') || window.location.href.includes('lasmin-ai-280275748399.asia-south1.run.app');

  const safeSendMessage = (msg, callback) => {
    if (!chrome.runtime?.id) return;
    try { chrome.runtime.sendMessage(msg, callback); } catch(e) {}
  };

// Only build and inject the Voice Assistant UI if voice is enabled
if (siteSettings.voice) {
  // 1. Inject the Container
  const root = document.createElement('div');
  root.id = 'lasminai-ext-root';
  if (isLasMinWebApp) {
    root.style.display = 'none';
  }
  document.documentElement.appendChild(root);

  // Moved safeSendMessage to the top level of the callback

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
      LasminAI Assistant <span id="lasminai-status-text" style="color: #9ca3af; font-weight: 400; margin-left: 4px;"></span>
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
      micBtn.classList.remove('processing');
      bubble.classList.add('visible');
      document.getElementById('lasminai-status-text').innerText = "Listening...";
      document.getElementById('lasminai-transcript').innerText = "Go ahead, I'm listening...";
      try { recognition.start(); } catch(e) {}
    } else {
      micBtn.classList.remove('listening');
      document.getElementById('lasminai-status-text').innerText = "";
      try { recognition.stop(); } catch(e) {}
      setTimeout(() => {
        if (!isListening && !isProcessing) {
          bubble.classList.remove('visible');
        }
      }, 3000);
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
    if (isDragging) return;
    if (!isListening && !isProcessing) {
      setListeningState(true);
    } else if (isListening) {
      setListeningState(false);
    }
  });

  async function processVoiceCommand(command) {
    isProcessing = true;
    micBtn.classList.remove('listening');
    micBtn.classList.add('processing');
    document.getElementById('lasminai-status-text').innerText = "Processing...";
    
    const localTime = new Date().toLocaleString('en-US');
    const offsetMinutes = new Date().getTimezoneOffset();
    const sign = offsetMinutes > 0 ? '-' : '+';
    const absOffset = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const minutes = String(absOffset % 60).padStart(2, '0');
    const timezoneOffset = `${sign}${hours}:${minutes}`;

    safeSendMessage({ 
      type: 'PROXY_FETCH', 
      url: '/api/voice/process',
      method: 'POST',
      body: { message: command, localTime, timezoneOffset, sourceUrl: window.location.href }
    }, (response) => {
      isProcessing = false;
      micBtn.classList.remove('processing');
      if (response && response.success && response.data) {
        const replyText = response.data.reply || "Done!";
        
        // Convert basic markdown to HTML for the visual transcript
        const visualHtml = replyText
          .replace(/^### (.*$)/gim, '<h3 style="font-weight: bold; margin: 8px 0 4px 0;">$1</h3>')
          .replace(/^## (.*$)/gim, '<h2 style="font-weight: bold; margin: 8px 0 4px 0;">$1</h2>')
          .replace(/^# (.*$)/gim, '<h1 style="font-weight: bold; margin: 8px 0 4px 0;">$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/\n/gim, '<br />');

        document.getElementById('lasminai-transcript').innerHTML = visualHtml;
        
        try {
          // Remove Markdown syntax and common emojis so the TTS engine doesn't read them out loud
          const cleanSpeechText = (response.data.replyVoice || replyText)
            .replace(/[*_#`~>]/g, '')
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/gu, '')
            .trim();

          const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
          utterance.onend = () => {
             setListeningState(false);
          };
          window.speechSynthesis.speak(utterance);
        } catch(e) {
          console.error("Speech synthesis failed", e);
          setTimeout(() => setListeningState(false), 5000);
        }
        
        // Handle Auto-fill JSON Command directly
        if (response.data.action === 'AUTO_FILL') {
          handleAutoFillResponse(response.data);
        }
      } else {
        const errorMsg = response?.error || 'Unknown error';
        if (errorMsg.toLowerCase().includes('not authenticated') || errorMsg.toLowerCase().includes('unauthorized')) {
            document.getElementById('lasminai-transcript').innerHTML = `<span style="color: #ef4444; font-weight: 600;">Auth Expired:</span> Please <a href="https://lasminai.vercel.app/auth" target="_blank" style="text-decoration: underline;">login to LasMinAI</a> again.`;
        } else {
            document.getElementById('lasminai-transcript').innerText = "Error: " + errorMsg;
        }
        setTimeout(() => setListeningState(false), 3000);
      }
    });
  }
} // End of siteSettings.voice check

// 4. Block Notifications & UI
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
document.documentElement.appendChild(blockerOverlay);

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!siteSettings.reminders) return; // Ignore blocker logic if reminders are disabled

  if (message.type === 'SHOW_BLOCKER' && message.reminders && message.reminders.length > 0) {
    if (window.location.href.includes('localhost:5174') || window.location.href.includes('lasmin-ai-280275748399.asia-south1.run.app')) {
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
          url: `/api/reminders/${idToDismiss}/dismiss`,
          method: 'PUT'
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
    method: 'PUT'
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

// 7. DOM Reader Task Extraction
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRIGGER_EXTRACT_TASKS') {
    handleExtractTasks();
  }
});

async function handleExtractTasks() {
  let text = window.getSelection().toString().trim();
  if (!text) {
    // 1. Try to find the primary content container
    let mainNode = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('article');
    
    // Gmail-specific logic: target the actual open email body
    if (window.location.hostname.includes('mail.google.com')) {
      const openEmails = document.querySelectorAll('.a3s');
      if (openEmails.length > 0) {
        // In threads, the last .a3s is typically the expanded/current one
        mainNode = openEmails[openEmails.length - 1];
      }
    }

    if (!mainNode) {
      mainNode = document.body;
    }

    // 2. Temporarily hide junk in the LIVE DOM so innerText ignores it.
    // Cloning loses CSS layout context, meaning innerText returns hidden text!
    const junkSelectors = ['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript', 'iframe', '.ad', '.ads', '.advertisement'];
    const hiddenElements = [];
    
    junkSelectors.forEach(sel => {
      const els = mainNode.querySelectorAll ? mainNode.querySelectorAll(sel) : [];
      els.forEach(el => {
        if (el.style.display !== 'none') {
          hiddenElements.push({ el, originalDisplay: el.style.display });
          el.style.display = 'none';
        }
      });
    });

    // 2.5 Expose hidden URLs safely without destroying child elements (images, spans)
    const linkRestores = [];
    if (mainNode.querySelectorAll) {
      mainNode.querySelectorAll('a').forEach(a => {
        if (a.href && a.href.startsWith('http') && !a.innerText.includes(a.href)) {
          const urlTextNode = document.createTextNode(` (${a.href})`);
          a.appendChild(urlTextNode);
          linkRestores.push({ a, urlTextNode });
        }
      });
    }

    // innerText on the live DOM accurately reflects what the user sees, plus our injected URLs
    text = mainNode.innerText || "";

    // 3. Restore DOM (Links first, then visibility)
    linkRestores.forEach(item => {
      item.a.removeChild(item.urlTextNode);
    });
    
    hiddenElements.forEach(item => {
      item.el.style.display = item.originalDisplay;
    });
  }

  if (!text) {
    alert("LasMinAI: Could not find any text to analyze.");
    return;
  }

  // Show a loading toast
  const toast = document.createElement('div');
  toast.innerText = "LasMinAI is reading the page for tasks...";
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 20px';
  toast.style.background = '#3b82f6';
  toast.style.color = 'white';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '999999';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
  toast.style.fontFamily = 'system-ui, sans-serif';
  document.body.appendChild(toast);

  safeSendMessage({
    type: 'PROXY_FETCH',
    url: '/api/extension/parse-dom',
    method: 'POST',
    body: { text: text.substring(0, 60000), url: window.location.href } // limit chars
  }, (response) => {
    toast.remove();
    if (response && response.success && response.data && response.data.tasks) {
      showExtractedTasksModal(response.data.tasks);
    } else if (response && response.error === 'Not authenticated') {
      if (confirm("LasMinAI: Your session expired. Please log in to the web app first. Click OK to open it.")) {
        window.open('https://lasminai.vercel.app', '_blank');
      }
    } else {
      alert("LasMinAI failed to extract tasks: " + (response?.error || response?.data?.message || "Unknown error"));
    }
  });
}

// --- QUEUE SYSTEM FOR EXTENSION REQUESTS ---
let requestQueue = [];
let isProcessingQueue = false;

function processQueue() {
  if (requestQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;
  const { message, callback } = requestQueue.shift();
  
  safeSendMessage(message, (response) => {
    if (callback) callback(response);
    setTimeout(processQueue, 300); // 300ms delay between requests
  });
}

function queueMessage(message, callback) {
  requestQueue.push({ message, callback });
  if (!isProcessingQueue) {
    processQueue();
  }
}
// -----------------------------------------

function showExtractedTasksModal(tasks) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'lasminai-tasks-modal-overlay';

  const modalBox = document.createElement('div');
  modalBox.className = 'lasminai-tasks-modal-box';

  const header = document.createElement('h2');
  header.className = 'lasminai-tasks-header';
  header.innerHTML = `<span>Extracted Tasks</span> <span style="font-size: 14px; font-weight: normal; color: rgba(0,0,0,0.5);">${tasks.length} found</span>`;
  modalBox.appendChild(header);

  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.innerText = "No tasks found on this page.";
    empty.style.color = 'rgba(0, 0, 0, 0.6)';
    modalBox.appendChild(empty);
  }

  tasks.forEach((task, index) => {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'lasminai-task-card';
    taskDiv.id = `lasminai-task-${index}`;

    const titleInput = document.createElement('input');
    titleInput.className = 'lasminai-task-input title-input';
    titleInput.value = task.title;

    const descInput = document.createElement('textarea');
    descInput.className = 'lasminai-task-textarea';
    descInput.value = task.description || '';
    descInput.placeholder = 'Add details or context...';

    const deadlineInput = document.createElement('input');
    deadlineInput.className = 'lasminai-task-input';
    deadlineInput.type = 'datetime-local';
    if (task.deadline) {
      try {
        let rawStr = task.deadline;
        // If it's a pure YYYY-MM-DD date without time, assume end of day local time
        if (rawStr.length === 10 && rawStr.includes('-')) {
          rawStr += 'T23:59:59';
        }
        const d = new Date(rawStr);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        deadlineInput.value = d.toISOString().slice(0, 16);
      } catch (e) {}
    }

    const controls = document.createElement('div');
    controls.className = 'lasminai-task-controls';

    const addBtn = document.createElement('button');
    addBtn.className = 'lasminai-btn-add';
    addBtn.innerText = "Add Task";

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'lasminai-btn-reject';
    rejectBtn.innerText = "Reject";

    addBtn.onclick = () => {
      addBtn.innerText = 'Adding...';
      let defaultDl = new Date();
      if (defaultDl.getHours() >= 20) {
        defaultDl.setDate(defaultDl.getDate() + 1); // Push to tomorrow if it's late
      }
      defaultDl.setHours(23, 59, 59, 999);
      
      const dl = deadlineInput.value ? new Date(deadlineInput.value).toISOString() : defaultDl.toISOString();
      queueMessage({
        type: 'PROXY_FETCH',
        url: '/api/tasks',
        method: 'POST',
        body: {
          title: titleInput.value,
          description: descInput.value,
          deadline: dl,
          complexity: task.complexity || 3,
          technicalEffort: task.technicalEffort || 2,
          sourceUrl: window.location.href
        }
      }, (resp) => {
        // FIX: Also check resp.data.success to ensure the actual server request succeeded
        if (resp && resp.success && resp.data && resp.data.success) {
          taskDiv.style.opacity = '0';
          taskDiv.style.transform = 'scale(0.95)';
          taskDiv.style.transition = 'all 0.3s ease';
          setTimeout(() => {
            taskDiv.remove();
            if (modalBox.querySelectorAll('.lasminai-task-card').length === 0) {
              modalOverlay.remove();
            }
          }, 300);
        } else {
          addBtn.innerText = 'Failed';
        }
      });
    };

    rejectBtn.onclick = () => {
      taskDiv.style.opacity = '0';
      taskDiv.style.transform = 'scale(0.95)';
      taskDiv.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        taskDiv.remove();
        if (modalBox.querySelectorAll('.lasminai-task-card').length === 0) {
          modalOverlay.remove();
        }
      }, 300);
    };

    controls.appendChild(addBtn);
    controls.appendChild(rejectBtn);

    taskDiv.appendChild(titleInput);
    taskDiv.appendChild(descInput);
    taskDiv.appendChild(deadlineInput);
    taskDiv.appendChild(controls);
    modalBox.appendChild(taskDiv);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lasminai-btn-close';
  closeBtn.innerText = "Close";
  closeBtn.onclick = () => modalOverlay.remove();
  
  modalBox.appendChild(closeBtn);
  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);
}

}); // End of excludedDomains callback
