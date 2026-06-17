/**
 * Lie Detection Group — Telegram Chat Widget
 * Browser widget → /chat API → Telegram managers group
 */
(function () {
  'use strict';

  const STORAGE_USER = 'ldg_chat_user_id';
  const STORAGE_HISTORY = 'ldg_chat_history';
  const POLL_INTERVAL = 3000;
  const API_BASE = '/chat';

  const ICON_CHAT = '<svg class="ldg-chat__icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const ICON_CLOSE = '<svg class="ldg-chat__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  const ICON_HEADSET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';

  let pollTimer = null;
  let isOpen = false;
  let unread = 0;
  let sending = false;

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
    const trimmed = messages.slice(-200);
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(trimmed));
  }

  function formatTime(ts) {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }

  function apiUrl(action, params) {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return url.toString();
  }

  async function sendMessage(text) {
    const userId = getUserId();
    const res = await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.description || 'send failed');
    }
    return data;
  }

  async function pollMessages() {
    const userId = getUserId();
    const res = await fetch(apiUrl('poll', { user_id: userId }));
    if (!res.ok) return [];
    const data = await res.json();
    return data.ok && Array.isArray(data.messages) ? data.messages : [];
  }

  const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

  function syncLauncherPlacement(els) {
    const dock = document.getElementById('mobileDock');
    const isMobile = MOBILE_MQ.matches;

    if (isMobile && dock) {
      els.launcher.classList.add('ldg-chat__launcher--dock');
      dock.appendChild(els.launcher);
      requestAnimationFrame(() => {
        const bar = document.getElementById('mobileBottomBar');
        if (bar) {
          document.documentElement.style.setProperty('--mobile-bottom-bar-h', `${bar.offsetHeight}px`);
        }
      });
      return;
    }

    els.launcher.classList.remove('ldg-chat__launcher--dock');
    if (!els.root.contains(els.launcher)) {
      els.root.insertBefore(els.launcher, els.panel);
    }
  }

  function buildWidget() {
    const root = document.createElement('div');
    root.className = 'ldg-chat';
    root.innerHTML = `
      <button type="button" class="ldg-chat__launcher" id="ldgChatLauncher" aria-label="Відкрити чат" aria-expanded="false">
        <span class="ldg-chat__dock-icon" aria-hidden="true">${ICON_CHAT}${ICON_CLOSE}</span>
        <span class="ldg-chat__dock-label">Чат</span>
        <span class="ldg-chat__badge" id="ldgChatBadge" aria-hidden="true">0</span>
      </button>
      <div class="ldg-chat__panel" id="ldgChatPanel" role="dialog" aria-label="Чат з менеджером" aria-hidden="true">
        <div class="ldg-chat__header">
          <div class="ldg-chat__avatar">${ICON_HEADSET}</div>
          <div>
            <div class="ldg-chat__title">Онлайн-консультація</div>
            <div class="ldg-chat__subtitle">Відповімо найближчим часом</div>
          </div>
        </div>
        <div class="ldg-chat__messages" id="ldgChatMessages"></div>
        <div class="ldg-chat__status" id="ldgChatStatus"></div>
        <div class="ldg-chat__footer">
          <textarea class="ldg-chat__input" id="ldgChatInput" rows="1" placeholder="Напишіть повідомлення…" maxlength="4096"></textarea>
          <button type="button" class="ldg-chat__send" id="ldgChatSend" aria-label="Надіслати">${ICON_SEND}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return {
      root,
      launcher: root.querySelector('#ldgChatLauncher'),
      panel: root.querySelector('#ldgChatPanel'),
      messages: root.querySelector('#ldgChatMessages'),
      input: root.querySelector('#ldgChatInput'),
      sendBtn: root.querySelector('#ldgChatSend'),
      status: root.querySelector('#ldgChatStatus'),
      badge: root.querySelector('#ldgChatBadge'),
    };
  }

  function renderMessages(els, history) {
    els.messages.innerHTML = '';
    history.forEach((msg) => {
      const el = document.createElement('div');
      el.className = `ldg-chat__msg ldg-chat__msg--${msg.dir}`;
      el.textContent = msg.text;
      if (msg.ts) {
        const time = document.createElement('span');
        time.className = 'ldg-chat__time';
        time.textContent = formatTime(msg.ts);
        el.appendChild(time);
      }
      els.messages.appendChild(el);
    });
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setStatus(els, text, isError) {
    els.status.textContent = text || '';
    els.status.classList.toggle('ldg-chat__status--error', !!isError);
  }

  function updateBadge(els) {
    if (unread > 0) {
      els.badge.textContent = unread > 9 ? '9+' : String(unread);
      els.badge.classList.add('ldg-chat__badge--visible');
    } else {
      els.badge.classList.remove('ldg-chat__badge--visible');
    }
  }

  function togglePanel(els, open) {
    isOpen = open;
    els.panel.classList.toggle('ldg-chat__panel--open', open);
    els.launcher.classList.toggle('ldg-chat__launcher--open', open);
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
          incoming.forEach((m) => {
            history.push({ dir: 'in', text: m.text, ts: m.ts, id: m.id });
          });
          saveHistory(history);
          renderMessages(els, history);
          if (!isOpen) {
            unread += incoming.length;
            updateBadge(els);
          }
        }
      } catch {
        /* silent on poll errors */
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
    const optimistic = { dir: 'out', text, ts: Math.floor(Date.now() / 1000) };
    history.push(optimistic);
    saveHistory(history);
    renderMessages(els, history);
    els.input.value = '';

    try {
      await sendMessage(text);
      setStatus(els, '');
    } catch (err) {
      setStatus(els, 'Не вдалося надіслати. Спробуйте ще раз.', true);
    } finally {
      sending = false;
      els.sendBtn.disabled = false;
    }
  }

  function init() {
    const els = buildWidget();
    let history = loadHistory();

    if (!history.length) {
      history = [{
        dir: 'system',
        text: 'Вітаємо! Напишіть питання — менеджер відповість тут.',
      }];
      saveHistory(history);
    }

    renderMessages(els, history);

    syncLauncherPlacement(els);
    MOBILE_MQ.addEventListener('change', () => syncLauncherPlacement(els));
    window.addEventListener('resize', () => syncLauncherPlacement(els), { passive: true });

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
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling(els);
      }
    });

    startPolling(els);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
