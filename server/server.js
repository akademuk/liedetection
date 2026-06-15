import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkRateLimit } from './rateLimit.js';
import {
  pumpTelegram,
  sendTelegramMessage,
  deleteWebhook,
  validateUserId,
  pollInbox,
  formatOutgoingMessage,
} from './chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '16kb' }));

app.use('/chat', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function handleChat(req, res) {
  const action = req.query.action;

  try {
    if (action === 'sendMessage' && req.method === 'POST') {
      const text = req.body?.text;
      if (typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ ok: false, error: 'text is required' });
      }
      if (text.length > 4096) {
        return res.status(400).json({ ok: false, error: 'text too long' });
      }

      const userId = req.body?.user_id;
      if (!validateUserId(userId)) {
        return res.status(400).json({ ok: false, error: 'invalid user_id' });
      }

      const telegramText = formatOutgoingMessage(userId, text.trim());
      const result = await sendTelegramMessage(telegramText);
      await pumpTelegram();
      return res.json(result);
    }

    if (action === 'poll' && req.method === 'GET') {
      const userId = req.query.user_id;
      if (!validateUserId(userId)) {
        return res.status(400).json({ ok: false, error: 'invalid user_id' });
      }

      await pumpTelegram();
      const messages = pollInbox(userId);
      return res.json({ ok: true, messages });
    }

    if (action === 'deleteWebhook' && req.method === 'GET') {
      const result = await deleteWebhook();
      return res.json(result);
    }

    return res.status(400).json({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error('[chat]', err);
    return res.status(500).json({ ok: false, error: 'internal error' });
  }
}

app.get('/chat', handleChat);
app.post('/chat', handleChat);

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
