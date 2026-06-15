import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheTryLock,
  cacheReleaseLock,
} from './cache.js';

const USER_ID_RE = /usr_[a-z0-9]+/i;
const USER_ID_VALIDATE = /^usr_[a-z0-9]+$/i;
const INBOX_TTL = 30 * 60;
const INBOX_MAX = 100;
const OFFSET_TTL = 24 * 60 * 60;
const PUMP_LOCK_TTL = 8;

function getConfig() {
  const token = process.env.telegramBotToken;
  const chatId = process.env.telegramChatId;
  if (!token || !chatId) {
    throw new Error('telegramBotToken and telegramChatId must be set in env');
  }
  return { token, chatId };
}

async function telegramRequest(token, method, body) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const options = { method: body ? 'POST' : 'GET' };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json();

  if (res.status === 409) {
    const err = new Error('Telegram conflict');
    err.status = 409;
    throw err;
  }

  return data;
}

export async function deleteWebhook() {
  const { token } = getConfig();
  return telegramRequest(token, 'deleteWebhook', { drop_pending_updates: false });
}

export async function sendTelegramMessage(text) {
  const { token, chatId } = getConfig();
  return telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

function extractUserId(text) {
  if (!text) return null;
  const match = text.match(USER_ID_RE);
  return match ? match[0].toLowerCase() : null;
}

function pushToInbox(userId, message) {
  const key = `chat_inbox_${userId}`;
  const inbox = cacheGet(key) || [];
  const exists = inbox.some((m) => m.id === message.id);
  if (exists) return;

  inbox.push(message);
  while (inbox.length > INBOX_MAX) inbox.shift();
  cacheSet(key, inbox, INBOX_TTL);
}

export async function pumpTelegram() {
  const locked = cacheTryLock('chat_pump_lock', PUMP_LOCK_TTL);
  if (!locked) return;

  try {
    const { token, chatId } = getConfig();
    let offset = cacheGet('chat_global_offset') ?? 0;

    const fetchUpdates = async () => {
      const params = new URLSearchParams({
        offset: String(offset),
        timeout: '0',
      });
      const url = `https://api.telegram.org/bot${token}/getUpdates?${params}`;
      const res = await fetch(url);
      if (res.status === 409) {
        await deleteWebhook();
        return fetchUpdates();
      }
      return res.json();
    };

    let data;
    try {
      data = await fetchUpdates();
    } catch (err) {
      console.error('[pumpTelegram] fetch failed:', err.message);
      return;
    }

    if (!data.ok || !Array.isArray(data.result)) return;

    let maxUpdateId = offset > 0 ? offset - 1 : -1;

    for (const update of data.result) {
      if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

      const msg = update.message;
      if (!msg) continue;
      if (String(msg.chat?.id) !== String(chatId)) continue;
      if (!msg.reply_to_message) continue;

      const userId = extractUserId(msg.reply_to_message.text);
      if (!userId || !USER_ID_VALIDATE.test(userId)) continue;

      pushToInbox(userId, {
        id: msg.message_id,
        text: msg.text || '',
        ts: msg.date || Math.floor(Date.now() / 1000),
      });
    }

    if (maxUpdateId >= 0) {
      cacheSet('chat_global_offset', maxUpdateId + 1, OFFSET_TTL);
    }
  } finally {
    cacheReleaseLock('chat_pump_lock');
  }
}

export function validateUserId(userId) {
  return typeof userId === 'string' && USER_ID_VALIDATE.test(userId);
}

export function pollInbox(userId) {
  const key = `chat_inbox_${userId}`;
  const messages = cacheGet(key) || [];
  cacheDelete(key);
  return messages;
}

export function formatOutgoingMessage(userId, text) {
  return `🌐 Сайт Lie Detection Group\n👤 ${userId}\n\n${text}`;
}
