# Lie Detection Group — Homepage Concept

Преміальна головна сторінка для Lie Detection Group — професійної перевірки на поліграфі в Києві та по Україні.

## Запуск

Відкрийте `index.html` у браузері або запустіть локальний сервер:

```bash
npx serve .
# або
python3 -m http.server 8080
```

Потім відкрийте `http://localhost:8080` (або порт, який покаже serve).

## Структура

```
liedetection/
├── index.html          # Головна сторінка (всі секції)
├── css/
│   └── main.css        # Стилі, теми dark/light, адаптив
├── js/
│   └── main.js         # Lenis, GSAP, Swiper, theme toggle
└── README.md
```

## Технології

- HTML5, CSS3 (CSS Variables для тем)
- [Lenis](https://lenis.studiofreight.com/) — плавний скрол
- [GSAP + ScrollTrigger](https://greensock.com/gsap/) — fade-in, parallax
- [Swiper](https://swiperjs.com/) — карусель відгуків
- [Fancybox](https://fancyapps.com/) — готовий до галереї

## Теми

- **Dark** (за замовчуванням) — основна тема
- **Light** — перемикається кнопкою в header, зберігається в `localStorage`

## Секції

Header · Hero · Коли потрібен поліграф · Послуги · Переваги · Процес · Ціни · Для бізнесу · Для приватних клієнтів · Відгуки · FAQ · Контакти · Footer
