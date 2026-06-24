export const reminderChannel = new BroadcastChannel('lasminai_reminders');

export const broadcastReminderAction = (action, payload = {}) => {
  // Broadcast to other tabs
  reminderChannel.postMessage({ action, payload });
  // Dispatch to the same tab
  window.dispatchEvent(new CustomEvent('lasminai_reminders_local', { detail: { action, payload } }));
};

export const subscribeToReminderActions = (callback) => {
  const handleBroadcast = (e) => callback(e.data.action, e.data.payload);
  const handleLocal = (e) => callback(e.detail.action, e.detail.payload);
  
  reminderChannel.addEventListener('message', handleBroadcast);
  window.addEventListener('lasminai_reminders_local', handleLocal);
  
  return () => {
    reminderChannel.removeEventListener('message', handleBroadcast);
    window.removeEventListener('lasminai_reminders_local', handleLocal);
  };
};
