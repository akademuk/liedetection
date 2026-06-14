# Lie Detection Group — Static HTML

Преміальний статичний макет сайту Lie Detection Group — професійної перевірки на поліграфі в Києві та по Україні. Підготовлено для подальшої натяжки на WordPress (ACF).

## Запуск

Відкрийте `index.html` у браузері або запустіть локальний сервер:

```bash
npx serve .
# або
python3 -m http.server 8080
```

Потім відкрийте `http://localhost:8080`.

## Структура

```
liedetection/
├── index.html              # Головна сторінка
├── pages/                  # Внутрішні сторінки (.html)
├── css/
│   ├── fonts.css           # @font-face (Inter, Manrope)
│   └── main.css            # Стилі, теми dark/light, адаптив
├── js/
│   ├── main.js             # Основна логіка
│   └── vendor/             # Lenis, GSAP, Swiper, Fancybox
├── fonts/
│   ├── inter/              # woff2, cyrillic + latin
│   └── manrope/
├── img/
│   ├── visuals/            # Ілюстрації та фото секцій
│   ├── logos/              # Логотипи партнерів
│   └── …                   # Логотип, hero-відео, фото команди
├── robots.txt
└── README.md
```

## Технології

- HTML5, CSS3 (CSS Variables для тем)
- Lenis — плавний скрол
- GSAP + ScrollTrigger — анімації
- Swiper — карусель відгуків
- Fancybox — галерея

## Теми

- **Dark** (за замовчуванням) — основна тема
- **Light** — перемикається кнопкою в header, зберігається в `localStorage`
