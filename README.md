# progtype

Платформа для публикации статей в стиле Teletype — с поддержкой нескольких
создателей, embed-блоков сайтов (через iframe) и аналитики через Telegram-бота.

**Live:** https://vfyov6621-coder.github.io/progtype/

## Архитектура

```
┌─────────────────────┐         ┌──────────────────────┐
│  progtype website   │         │  progtype Telegram   │
│  (GitHub Pages)     │         │  bot (HF Spaces)     │
│                     │         │                      │
│  Next.js 16 static  │         │  Python + python-tg  │
│  Firebase Client SDK│         │  Firebase Admin SDK  │
└─────────┬───────────┘         └──────────┬───────────┘
          │                                │
          │   ┌────────────────────────────┼─┐
          │   │  Firebase project           │ │
          └──▶│  kres-portfolio             │◀┘
              │                              │
              │  /articles/{slug}            │
              │  /article_views/{id}         │
              │  /creators/{uid}             │
              │  + Auth (email/password)     │
              └──────────────────────────────┘
```

- **Website** (этот репозиторий): статика на GitHub Pages, использует Firebase Client SDK
- **Telegram bot** (`bot/` подкаталог): Python на HuggingFace Spaces, использует Firebase Admin SDK
- **Shared backend**: один Firebase проект `kres-portfolio`

## Роли

| Роль | Кто | Что может |
|------|-----|-----------|
| **Гость** | Любой посетитель сайта | Читать опубликованные статьи |
| **Создатель** | Юзер, заведённый ботом | + Писать/редактировать свои статьи |
| **Супер-админ** | `kres@krestype.app` | + Видеть все статьи + аналитика на сайте |
| **Telegram-админ** | Указан в `ADMIN_TELEGRAM_IDS` | Создавать/удалять creators в боте |

## Связь создателей со статьями

Каждая статья имеет поле `creatorId` (Firebase Auth uid автора):
- Создатель при входе видит только свои статьи (`where("creatorId", "==", uid)`)
- Супер-админ видит все
- Firestore Security Rules гарантируют, что creator A не может изменить статью creator B (проверка `resource.data.creatorId == request.auth.uid`)

## Технологии

- **Website**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + recharts
- **Bot**: Python 3.11 + python-telegram-bot 21 + firebase-admin 6
- **Backend**: Firebase Auth + Cloud Firestore
- **Hosting**: GitHub Pages (website) + HuggingFace Spaces (bot)

## Локальная разработка

```bash
bun install
bun run dev    # http://localhost:3000
```

## Структура

```
├── src/                          # Website (Next.js)
│   ├── app/
│   │   ├── page.tsx              # hash-routing main page
│   │   ├── layout.tsx            # root layout + metadata
│   │   └── globals.css           # typography
│   ├── components/progtype/      # 10 UI components
│   ├── lib/
│   │   ├── firebase.ts           # Firebase Client SDK init
│   │   ├── auth-context.tsx      # Auth + role detection
│   │   ├── articles.ts           # CRUD + creator filter
│   │   ├── analytics.ts          # view tracking + aggregation
│   │   └── router.ts             # hash-based router
│   └── types/index.ts            # Article, Block, Creator types
├── bot/                          # Telegram bot (separate Python project)
│   ├── bot.py                    # bot logic
│   ├── requirements.txt
│   ├── Dockerfile                # for HuggingFace Spaces
│   └── README.md                 # bot deployment guide
├── public/404.html               # SPA fallback
├── firebase.json                 # firestore rules/indexes config
├── firestore.rules               # security rules (3 apps share project)
├── firestore.indexes.json        # composite indexes
├── .github/workflows/deploy.yml  # GitHub Pages CI/CD
└── next.config.ts                # static export + basePath=/progtype
```

## Подготовка Firebase (один раз)

1. https://console.firebase.google.com → project `kres-portfolio`
2. **Authentication → Sign-in method → Email/Password → Enable**
3. **Authentication → Users → Add user**:
   - Email: `kres@krestype.app` (супер-админ)
   - Password: придумайте надёжный
4. **Firestore Database → Create database** (production mode)
5. **Firestore → Rules** — вставить содержимое `firestore.rules` → Publish
6. **Firestore → Indexes** — индексы создадутся автоматически при первом запросе,
   либо по ссылке из ошибки Firestore

## Деплой

### Website (автоматически)

При пуше в `main` GitHub Actions:
1. `bun install` + `bun run build` → `/out`
2. Заливает `/out` на GitHub Pages
3. URL: https://vfyov6621-coder.github.io/progtype/

### Telegram bot

См. детальную инструкцию: [`bot/README.md`](./bot/README.md)

Кратко:
1. Создать HuggingFace Space (SDK: Docker)
2. Залить файлы из `bot/`
3. Установить секреты: `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, `FIREBASE_SERVICE_ACCOUNT`
4. Space автоматически соберётся и запустит бота

## Роутинг (hash-based)

- `/#/`                  — главная (публичные статьи)
- `/#/article/:slug`     — чтение статьи
- `/#/login`             — вход для создателей
- `/#/admin`             — кабнет (creator видит свои, admin — все)
- `/#/admin/new`         — новая статья
- `/#/admin/edit/:slug`  — редактирование
- `/#/admin/analytics`   — аналитика (только супер-админ)

## Безопасность

- **Пароли не хранятся в коде** — только в Firebase Auth
- **Email супер-админа** хранится в `src/lib/firebase.ts` (нужно для client-side проверки роли)
- **Bot token** и **Firebase service account** — только в секретах HuggingFace Space
- **Firestore Rules** гарантируют изоляцию создателей (см. `firestore.rules`)

## Embed-блоки

Блок «Веб-страница» встраивает произвольный URL через `<iframe>` с sandbox.
Многие сайты (Google, Twitter, банки) запрещают встраивание через
`X-Frame-Options` — для них показывается fallback со ссылкой «Открыть в новой вкладке».

## 24/7 работа

- **GitHub Pages**: глобальный CDN, авто-HTTPS, ~99% uptime
- **HuggingFace Spaces**: бесплатный CPU-контейнер, перезапускается при падении
- **Firebase**: 99.9% SLA, автоматическое масштабирование

## Лицензия

MIT
