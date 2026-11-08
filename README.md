# Довідник електроніки — Headless CMS (Next.js + Sanity)

Самостійна робота з дисципліни «Інструментальні засоби веб-технологій», варіант 3 (Headless CMS / JAMstack) з AI-бонусом.

Веб-довідник з електронних компонентів і DIY-проєктів з форумом обговорень та панеллю адміністрування.

## Стек

| Шар | Технологія |
|---|---|
| Контент (бекенд) | Sanity (headless CMS, Content Lake, GROQ API) |
| Адмін-панель | Sanity Studio, вбудована в сайт на `/studio` |
| Фронтенд | Next.js 16 (App Router, React 19, TypeScript) |
| Рендеринг | SSG + ISR, оновлення за вебхуком (`revalidateTag`) |
| AI | OpenAI: модерація коментарів, автопереклад UK→EN, генерація SEO-описів |
| Хостинг | Vercel |

## Сторінки

- `/uk`, `/en` — головна (анімована схема, статистика, категорії, нові проєкти)
- `/[lang]/components` — таблиця підбору з пошуком і фільтром за категорією
- `/[lang]/components/[slug]` — картка компонента: характеристики, проєкти, коментарі
- `/[lang]/projects`, `/[lang]/projects/[slug]` — DIY-проєкти з кроками
- `/[lang]/forum`, `/[lang]/forum/[slug]` — форум
- `/[lang]/about` — про сайт і правила
- `/studio` — адмін-панель
- `/sitemap.xml`, `/robots.txt`

## Запуск локально

Без жодних ключів сайт працює в **демо-режимі** на даних з `data/seed.json`:

```bash
npm install
npm run dev        # http://localhost:3000
```

## Підключення Sanity

1. Створіть проєкт: `npx sanity@latest init --bare` (або на https://www.sanity.io/manage). Запишіть Project ID.
2. Скопіюйте `.env.example` у `.env.local` і заповніть `NEXT_PUBLIC_SANITY_PROJECT_ID`.
3. У налаштуваннях проєкту → **API → CORS origins** додайте `http://localhost:3000` і адресу сайту на Vercel (з дозволом credentials).
4. **API → Tokens** → створіть токен з правами *Editor* → `SANITY_API_WRITE_TOKEN`.
5. Імпортуйте демо-контент: `npm run seed`.
6. Відкрийте `http://localhost:3000/studio` і увійдіть.

## Ролі та workflow

| Роль Sanity | Що робить |
|---|---|
| Administrator | керує учасниками, токенами, вебхуками |
| Editor | створює і публікує компоненти, проєкти, теми; модерує коментарі |
| Viewer | лише перегляд у Studio |

Коментар відвідувача → `POST /api/comments` → AI-модерація → `approved` (публікується одразу) / `rejected` / `pending` (якщо AI недоступний) → модератор у Studio бачить чергу «⏳ Коментарі на модерації» і «🚩 Позначені AI».

Редактор публікує документ → вебхук `/api/revalidate` скидає кеш потрібного типу → сторінка оновлюється за секунди, без повного перезбирання.

## Вебхуки (Sanity → API → Webhooks)

| Назва | URL | Фільтр | Projection | Secret |
|---|---|---|---|---|
| Revalidate | `https://<сайт>/api/revalidate` | *(порожньо)* | `{_type}` | `SANITY_REVALIDATE_SECRET` |
| AI | `https://<сайт>/api/ai` | `_type in ["component","project"] && aiTranslate == true` | `{_id, _type}` | `SANITY_AI_WEBHOOK_SECRET` |

Обидва — на події Create і Update, dataset `production`, HTTP POST.

## AI (бонус)

- **Перевірка заявок** — компоненти й проєкти користувачів: схвалити / на доопрацювання / відхилити / до адміністратора.
- **Модерація** коментарів, тем форуму й повідомлень у чаті.
- **Автопереклад** — після публікації заповнює порожні англійські поля; ручні переклади не перезаписує.
- **SEO-опис** — генерує meta description українською та англійською, якщо редактор його не задав.

Провайдер — безкоштовний **Google Gemini** (`GEMINI_API_KEY`, ключ на aistudio.google.com/apikey, без картки). Можна додати ще безкоштовний **Groq** (`GROQ_API_KEY`) — його сайт використає, коли закінчиться денний ліміт Gemini; підтримується й платний `OPENAI_API_KEY`. Перевірка налаштувань: `npm run check:ai`. Ключі використовуються лише на сервері. Без них сайт працює, а заявки й коментарі чекають ручної модерації.

## Безпека (OWASP Top 10)

- **A01 Broken Access Control** — запис у CMS лише через серверні маршрути з токеном; Studio захищена авторизацією Sanity.
- **A02 Cryptographic Failures / A05 Misconfiguration** — HSTS, CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; секрети лише в змінних середовища.
- **A03 Injection** — GROQ-запити параметризовані (`$slug`, `$id`); вхідні дані валідуються Zod; React екранує вивід (XSS); JSON-LD екранує `<`.
- **A04 Insecure Design** — модерація перед публікацією, honeypot-поле, обмеження частоти (5 коментарів / 10 хв з IP), перевірка Origin (CSRF).
- **A07 Authentication Failures** — вебхуки перевіряють HMAC-підпис (`parseBody`).

Перевірка заголовків: https://observatory.mozilla.org

## Деплой на Vercel

1. Залийте репозиторій на GitHub.
2. https://vercel.com/new → Import → фреймворк Next.js визначиться автоматично.
3. Додайте всі змінні з `.env.example` (з `NEXT_PUBLIC_SITE_URL=https://<ваш-домен>`).
4. Deploy. Потім налаштуйте CORS і вебхуки в Sanity на продакшн-адресу.

## Структура

```
app/[lang]/…           сторінки сайту (uk/en)
app/api/comments       прийом коментарів
app/api/revalidate     вебхук ISR
app/api/ai             вебхук AI-перекладу і SEO
app/studio             адмін-панель
sanity/schemaTypes     модель контенту
sanity/structure.ts    структура адмінки (черга модерації)
lib/data.ts            GROQ-запити + демо-режим
lib/ai.ts              інтеграція з OpenAI
data/seed.json         демо-контент
proxy.ts               редирект / → /uk або /en
next.config.ts         заголовки безпеки
```
