---
title: progtype bot
emoji: 📝
colorFrom: gray
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# progtype Telegram bot

Multi-creator admin bot for the [progtype](https://github.com/vfyov6621-coder/progtype) article publishing platform.

## What it does

- **Create creator accounts** — admin creates new authors via `/add_creator`
- **List creators** — `/creators` shows all registered authors
- **Deactivate creators** — `/del_creator` blocks access without deleting articles
- **Show platform stats** — `/stats` shows creators/articles/views count
- **Analytics** — `/analytics` shows view charts (admin: all, creator: own)
- **My articles** — creators can list their own articles via `/my_articles`

## Deploy to HuggingFace Spaces

### 1. Create a new Space

1. Go to https://huggingface.co/new-space
2. Owner: your account
3. Name: `progtype-bot` (or any)
4. License: MIT
5. SDK: **Docker**
6. Hardware: **CPU basic · Free** (the bot is tiny)
7. Create

### 2. Upload bot files

Either:
- Upload `bot.py`, `requirements.txt`, `Dockerfile`, `README.md` via web UI
- Or git clone the Space and push:
  ```bash
  git clone https://huggingface.co/spaces/YOUR_USERNAME/progtype-bot
  cp bot.py requirements.txt Dockerfile README.md YOUR_USERNAME/progtype-bot/
  cd YOUR_USERNAME/progtype-bot
  git add -A && git commit -m "init bot" && git push
  ```

### 3. Set secrets

In the Space → **Settings** → **Repository secrets** → **New secret**:

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | Token from [@BotFather](https://t.me/BotFather) |
| `ADMIN_TELEGRAM_IDS` | Your Telegram user ID (find via [@userinfobot](https://t.me/userinfobot)). Multiple admins: comma-separated `123456,789012` |
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON content of Firebase service account key (see below) |

### 4. Get Firebase service account key

1. https://console.firebase.google.com → project `kres-portfolio`
2. ⚙️ Project Settings → **Service accounts** tab
3. Click **Generate new private key** → download JSON
4. Open the JSON file in a text editor
5. Copy **all** content (including `{` and `}`)
6. Paste into the `FIREBASE_SERVICE_ACCOUNT` secret

### 5. Start the bot

The Space will rebuild automatically after pushing or changing secrets. Open the Space logs to see startup messages.

### 6. Talk to the bot

In Telegram:
1. Find your bot by username (from @BotFather)
2. Send `/start` — you should see your role
3. Try `/stats` to verify Firebase connection works
4. `/add_creator alice@progtype.app strongpass123 Alice Smith` — create first creator

## Commands reference

| Command | Who | Description |
|---------|-----|-------------|
| `/start` | all | Greeting + your role |
| `/help` | all | List available commands |
| `/stats` | all | Quick platform stats |
| `/creators` | admin | List all creators |
| `/add_creator <email> <pass> <name>` | admin | Create new creator |
| `/del_creator <email>` | admin | Deactivate creator |
| `/analytics` | admin+creator | View charts (30 days) |
| `/analytics_7d` | admin+creator | View charts (7 days) |
| `/my_articles` | creator | List your articles |
| `/my_analytics` | creator | Analytics of your articles |

## Architecture

```
Telegram users ──> Bot (this Space) ──> Firebase Admin SDK
                                          ├── Auth (create/disable users)
                                          └── Firestore (creators, articles, views)
                                          
progtype website ──> Firebase Client SDK ──> Auth + Firestore
```

- **Bot** uses Firebase **Admin SDK** — bypasses Firestore rules, full access
- **Website** uses Firebase **Client SDK** — restricted by Firestore rules
- Creators created by bot get a Firebase Auth account + `/creators/{uid}` document
- Website reads `/creators/{uid}` to determine role (creator vs admin vs guest)
- Firestore rules enforce: creator can only write their own articles

## Updating Firestore rules

After bot creates first creator, make sure your `firestore.rules` (in the progtype repo) include the `/creators/{uid}` collection rule. The latest rules are always in `firestore.rules` at the repo root.

## Cost

- HuggingFace Spaces CPU basic: **free forever**
- Telegram Bot API: **free**
- Firebase Auth: **free** for unlimited users
- Firestore free tier: 50K reads / 20K writes per day — enough for small-medium platform

## License

MIT
