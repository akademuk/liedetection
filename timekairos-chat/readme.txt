=== Timekairos Chat ===
Contributors: timekairos
Tags: chat, telegram, ai, live chat, openai
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Віджет онлайн-чату з Telegram-менеджерами та підтримкою AI (локальні моделі або API). Розроблено Timekairos.

== Description ==

* Віджет чату на всіх сторінках сайту
* Режими: Telegram, AI, гібрид (AI + Telegram)
* Провайдери AI: OpenAI, Anthropic, Ollama (локально), custom OpenAI-compatible API
* Налаштування Bot Token та Chat ID в адмінці WordPress
* Rate limiting, nonce-захист REST API
* Токени та ключі зберігаються лише на сервері

== Installation ==

1. Скопіюйте папку `timekairos-chat` у `wp-content/plugins/`
2. Активуйте плагін у WordPress
3. Перейдіть у **Налаштування → Timekairos Chat**
4. Вкажіть Telegram Bot Token, Chat ID та (за потреби) AI-провайдера

== Telegram setup ==

1. Створіть бота через @BotFather
2. Додайте бота в групу менеджерів
3. Відповідайте на повідомлення клієнта через Reply у Telegram

== AI (Ollama local) ==

1. Встановіть Ollama на сервері
2. Оберіть провайдер **Ollama (локально)**
3. URL за замовчуванням: `http://127.0.0.1:11434`

== Changelog ==

= 1.0.0 =
* Початковий реліз
