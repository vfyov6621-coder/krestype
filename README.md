# krestype

Платформа для публикации статей в стиле Teletype — с поддержкой встроенных
блоков сайтов (через iframe). Только один администратор может писать,
остальные — читают.

**Live:** https://vfyov6621-coder.github.io/krestype/

## Технологии

- **Next.js 16** + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Firebase Auth** (email/password, только админ)
- **Cloud Firestore** (статьи, блоки)
- **GitHub Pages** (static export + GitHub Actions auto-deploy)

## Почему GitHub Pages

- Бесплатный хостинг статического контента
- Деплой одной командой `git push`
- HTTPS автоматически
- Не нужны секреты/токены Firebase в GitHub
- 100 GB/мес bandwidth и 1 GB storage на free tier

## Архитектура

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
│   ├── firebase.ts         # инициализация Firebase (client SDK)
│   ├── auth-context.tsx    # React Context для auth
│   ├── articles.ts         # CRUD статей в Firestore
│   └── router.ts           # hash-based роутинг
└── types/
    └── index.ts            # типы Article, Block

public/404.html             # SPA fallback для GitHub Pages
.github/workflows/deploy.yml # CI/CD: push → build → GitHub Pages
next.config.ts              # static export + basePath=/krestype
firestore.rules             # security rules (read public, write auth)
firestore.indexes.json      # индексы Firestore
```

## Локальная разработка

```bash
bun install
bun run dev    # http://localhost:3000
```

## Подготовка Firebase (один раз)

GitHub Pages — только статика. Данные и авторизация — в Firebase.

1. Зайти в [Firebase Console](https://console.firebase.google.com) → проект `kres-portfolio`
2. **Authentication → Sign-in method → Email/Password → Enable**
3. **Authentication → Users → Add user**:
   - Email: `kres@krestype.app`
   - Password: `190565`
4. **Firestore Database → Create database** (production mode, любой регион)
5. **Firestore → Rules** — вставить содержимое `firestore.rules` и нажать Publish
   (или выполнить `firebase deploy --only firestore:rules` локально с Firebase CLI)

Деплой Firestore rules через Firebase CLI (опционально, только когда меняете правила):
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

## Деплой на GitHub Pages (автоматически)

При пуше в `main` GitHub Actions:
1. Устанавливает зависимости (`bun install`)
2. Собирает статику (`bun run build` → `out/`)
3. Добавляет `.nojekyll` (чтобы GitHub Pages не игнорировал `_next/`)
4. Заливает `out/` в GitHub Pages

**URL сайта:** https://vfyov6621-coder.github.io/krestype/

Чтобы включить Pages первый раз:
1. GitHub repo → Settings → Pages → Source = **GitHub Actions**
2. Сделать любой push в `main` — запустится workflow

## Роутинг (hash-based)

Используется hash-based роутинг, потому что GitHub Pages не умеет
server-side rewrite (нельзя сказать «все 404 → /index.html»).
Hash-роутинг решает эту проблему: `#/article/my-slug` — клиент-side.

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

GitHub Pages обеспечивает:
- Глобальный CDN (Cloudflare)
- Автоматический HTTPS
- Высокий аптайм (GitHub инфраструктура)
- Авто-деплой из git

Для хранения данных и авторизации используется Firebase (отдельно от хостинга).

## Лицензия

© kres
