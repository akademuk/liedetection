/**
 * Timekairos Chat — WordPress widget
 * REST API + nonce, Telegram / AI backend
 */
(function () {
  'use strict';

  const cfg = window.tkChatConfig || {};
  if (!cfg.restUrl || !cfg.nonce) return;

  const STORAGE_USER = (cfg.storageKey || 'tk_chat') + '_user';
  const STORAGE_HISTORY = (cfg.storageKey || 'tk_chat') + '_history';
  const POLL_INTERVAL = Math.max(2000, Number(cfg.pollInterval) || 3000);

  const ICON_CHAT = '<svg class="tk-chat__icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const ICON_CLOSE = '<svg class="tk-chat__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  const ICON_HEADSET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';

  let pollTimer = null;
  let isOpen = false;
  let unread = 0;
  let sending = false;

  function apiHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-WP-Nonce': cfg.nonce,
    };
  }

  function getUserId() {
    let id = localStorage.getItem(STORAGE_USER);
    if (!id || !/^usr_[a-z0-9]+$/i.test(id)) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      let rand = '';
      for (let i = 0; i < 10; i++) rand += chars[bytes[i] % chars.length];
      id = 'usr_' + rand;
      localStorage.setItem(STORAGE_USER, id);
    }
    return id;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(messages) {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(messages.slice(-200)));
  }

  function formatTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }

  async function sendMessage(text) {
    const res = await fetch(cfg.restUrl + 'send', {
      method: 'POST',
      headers: apiHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({ text, user_id: getUserId() }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('send failed');
    }
    if (!res.ok || !data.ok) {
      const err = new Error(data.error || data.description || 'send failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function pollMessages() {
    const url = new URL(cfg.restUrl + 'poll', window.location.origin);
    url.searchParams.set('user_id', getUserId());
    const res = await fetch(url.toString(), {
      headers: apiHeaders(),
      credentials: 'same-origin',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.ok && Array.isArray(data.messages) ? data.messages : [];
  }

  function buildWidget() {
    const root = document.createElement('div');
    root.className = 'tk-chat';
    root.innerHTML = `
      <button type="button" class="tk-chat__launcher" id="tkChatLauncher" aria-label="Відкрити чат" aria-expanded="false">
        ${ICON_CHAT}${ICON_CLOSE}
        <span class="tk-chat__badge" id="tkChatBadge" aria-hidden="true">0</span>
      </button>
      <div class="tk-chat__panel" id="tkChatPanel" role="dialog" aria-label="Онлайн-чат" aria-hidden="true">
        <div class="tk-chat__header">
          <div class="tk-chat__avatar">${ICON_HEADSET}</div>
          <div>
            <div class="tk-chat__title">${escapeHtml(cfg.title || 'Онлайн-консультація')}</div>
            <div class="tk-chat__subtitle">${escapeHtml(cfg.subtitle || 'Відповімо найближчим часом')}</div>
          </div>
        </div>
        <div class="tk-chat__messages" id="tkChatMessages"></div>
        <div class="tk-chat__status" id="tkChatStatus"></div>
        <div class="tk-chat__footer">
          <textarea class="tk-chat__input" id="tkChatInput" rows="1" placeholder="Напишіть повідомлення…" maxlength="4096"></textarea>
          <button type="button" class="tk-chat__send" id="tkChatSend" aria-label="Надіслати">${ICON_SEND}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return {
      root,
      launcher: root.querySelector('#tkChatLauncher'),
      panel: root.querySelector('#tkChatPanel'),
      messages: root.querySelector('#tkChatMessages'),
      input: root.querySelector('#tkChatInput'),
      sendBtn: root.querySelector('#tkChatSend'),
      status: root.querySelector('#tkChatStatus'),
      badge: root.querySelector('#tkChatBadge'),
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMessages(els, history) {
    els.messages.innerHTML = '';
    history.forEach((msg) => {
      const el = document.createElement('div');
      el.className = `tk-chat__msg tk-chat__msg--${msg.dir}`;
      el.textContent = msg.text;
      if (msg.ts) {
        const time = document.createElement('span');
        time.className = 'tk-chat__time';
        time.textContent = formatTime(msg.ts);
        el.appendChild(time);
      }
      els.messages.appendChild(el);
    });
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setStatus(els, text, isError) {
    els.status.textContent = text || '';
    els.status.classList.toggle('tk-chat__status--error', !!isError);
  }

  function updateBadge(els) {
    if (unread > 0) {
      els.badge.textContent = unread > 9 ? '9+' : String(unread);
      els.badge.classList.add('tk-chat__badge--visible');
    } else {
      els.badge.classList.remove('tk-chat__badge--visible');
    }
  }

  function togglePanel(els, open) {
    isOpen = open;
    els.panel.classList.toggle('tk-chat__panel--open', open);
    els.launcher.classList.toggle('tk-chat__launcher--open', open);
    els.launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      unread = 0;
      updateBadge(els);
      els.input.focus();
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling(els) {
    stopPolling();
    const tick = async () => {
      try {
        const incoming = await pollMessages();
        if (incoming.length) {
          const history = loadHistory();
          incoming.forEach((m) => history.push({ dir: 'in', text: m.text, ts: m.ts, id: m.id }));
          saveHistory(history);
          renderMessages(els, history);
          if (!isOpen) {
            unread += incoming.length;
            updateBadge(els);
          }
        }
      } catch {
        /* silent */
      }
    };
    tick();
    pollTimer = setInterval(tick, POLL_INTERVAL);
  }

  async function handleSend(els) {
    const text = els.input.value.trim();
    if (!text || sending) return;

    sending = true;
    els.sendBtn.disabled = true;
    setStatus(els, '');

    const history = loadHistory();
    history.push({ dir: 'out', text, ts: Math.floor(Date.now() / 1000) });
    saveHistory(history);
    renderMessages(els, history);
    els.input.value = '';

    try {
      await sendMessage(text);
      const incoming = await pollMessages();
      if (incoming.length) {
        incoming.forEach((m) => history.push({ dir: 'in', text: m.text, ts: m.ts, id: m.id }));
        saveHistory(history);
        renderMessages(els, history);
      }
      setStatus(els, '');
    } catch (err) {
      const msg = err?.status === 429
        ? 'Забагато запитів. Зачекайте хвилину та спробуйте знову.'
        : 'Не вдалося надіслати. Спробуйте ще раз.';
      setStatus(els, msg, true);
    } finally {
      sending = false;
      els.sendBtn.disabled = false;
    }
  }

  function init() {
    const els = buildWidget();
    let history = loadHistory();

    if (!history.length) {
      history = [{ dir: 'system', text: cfg.welcome || 'Вітаємо! Напишіть питання.' }];
      saveHistory(history);
    }

    renderMessages(els, history);

    els.launcher.addEventListener('click', () => togglePanel(els, !isOpen));
    els.sendBtn.addEventListener('click', () => handleSend(els));
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(els);
      }
    });
    els.input.addEventListener('input', () => {
      els.input.style.height = 'auto';
      els.input.style.height = Math.min(els.input.scrollHeight, 120) + 'px';
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPolling();
      else startPolling(els);
    });

    startPolling(els);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
