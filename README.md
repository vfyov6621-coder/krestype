# krestype

Платформа для публикации статей в стиле Teletype — с поддержкой встроенных
блоков сайтов (через iframe). Только один администратор может писать,
остальные — читают.

## Технологии

- **Next.js 16** + TypeScript + Tailwind CSS + shadcn/ui
- **Firebase Auth** (email/password, только админ)
- **Cloud Firestore** (статьи, блоки)
- **Firebase Hosting** (статический экспорт + CDN)

## Структура

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # единственная страница (hash-routing)
│   ├── layout.tsx          # корневой layout
│   └── globals.css         # типографика
├── components/
│   ├── krestype/           # компоненты krestype
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── HomeView.tsx
│   │   ├── ArticleView.tsx
│   │   ├── LoginView.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── EditorView.tsx
│   │   ├── BlockEditor.tsx
│   │   ├── BlockRenderer.tsx
│   │   └── EmbedRenderer.tsx
│   └── ui/                 # shadcn/ui компоненты
├── lib/
│   ├── firebase.ts         # инициализация Firebase
│   ├── auth-context.tsx    # React Context для auth
│   ├── articles.ts         # CRUD статей в Firestore
│   └── router.ts           # hash-based роутинг
└── types/
    └── index.ts            # типы Article, Block

firebase.json               # конфиг Firebase Hosting + Firestore
.firebaserc                 # проект Firebase
firestore.rules             # security rules (read public, write auth)
firestore.indexes.json      # индексы Firestore
.github/workflows/deploy.yml # CI/CD: push → build → firebase deploy
```

## Локальная разработка

```bash
bun install
bun run dev    # http://localhost:3000
```

## Подготовка Firebase (один раз)

1. Зайти в [Firebase Console](https://console.firebase.google.com) → проект `kres-portfolio`
2. **Authentication → Sign-in method → Email/Password → Enable**
3. **Authentication → Users → Add user**:
   - Email: `kres@krestype.app`
   - Password: `190565`
4. **Firestore Database → Create database** (production mode, любой регион)
5. **Firestore → Rules** — скопировать содержимое `firestore.rules` ИЛИ
   дождаться деплоя через `firebase deploy --only firestore:rules`
6. **Hosting → Get started** (если ещё не настроен)

## Деплой

### Через GitHub Actions (рекомендуется)

При пуше в `main` автоматически:
1. Устанавливает зависимости
2. Делает `next build` (static export в `out/`)
3. Деплоит `out/` в Firebase Hosting
4. Деплоит Firestore rules + indexes

Нужен секрет `FIREBASE_SERVICE_ACCOUNT_KRES_PORTFOLIO` в GitHub репозитории
(Settings → Secrets → Actions → New repository secret).

Получить ключ сервисного аккаунта:
- Firebase Console → Project Settings → Service accounts → Generate new private key
- Скопировать содержимое JSON целиком в GitHub Secret

### Вручную

```bash
bun install
bun run build              # генерирует out/
npx firebase deploy        # деплой hosting + firestore
```

## Роутинг (hash-based)

- `/#/`                  — главная (список статей)
- `/#/article/:slug`     — чтение статьи
- `/#/login`             — вход админа
- `/#/admin`             — кабнет админа
- `/#/admin/new`         — новая статья
- `/#/admin/edit/:slug`  — редактирование

## Embed-блоки

Блок «Веб-страница» встраивает произвольный URL через `<iframe>` с sandbox.

Многие сайты (Google, Twitter/X, банки, YouTube на некоторых доменах)
запрещают встраивание через заголовок `X-Frame-Options: DENY` или
CSP `frame-ancestors`. Для таких сайтов показывается fallback с кнопкой
«Открыть в новой вкладке» — это не баг, а ограничение безопасности самих
сайтов, его обойти нельзя.

## 24/7 работа

Firebase Hosting обеспечивает:
- Глобальный Google CDN
- Автоматический SSL
- 99.9% uptime SLA на free tier
- Безлимитный bandwidth на free tier

Никакого сервера не нужно — вся логика клиент-side, данные в Firestore.

## Лицензия

© kres
