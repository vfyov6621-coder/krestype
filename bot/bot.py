"""
progtype Telegram bot
=====================

Multi-creator admin bot for progtype platform.

Features:
  - /start          — greeting + show user's role (admin/creator)
  - /stats          — quick stats: creators count, articles count, views count
  - /creators       — list all creators (admin only)
  - /add_creator    — create new creator (admin only)
                       usage: /add_creator email password displayName
  - /del_creator    — deactivate creator (admin only)
                       usage: /del_creator email
  - /analytics      — show views analytics (admin: all, creator: own)
  - /help           — show commands

Architecture:
  - Bot uses Firebase Admin SDK (bypasses Firestore rules)
  - Creates Firebase Auth users via Admin SDK
  - Writes /creators/{uid} documents in Firestore
  - Reads /articles and /article_views for analytics

Hosting: HuggingFace Spaces (Docker).
Secrets (set in Space Settings → Repository secrets):
  - TELEGRAM_BOT_TOKEN   — token from @BotFather
  - ADMIN_TELEGRAM_IDS   — comma-separated Telegram user IDs of super-admins
  - FIREBASE_SERVICE_ACCOUNT — full JSON content of Firebase service account key

See README_bot.md for deployment instructions.
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from collections import defaultdict

import firebase_admin
from firebase_admin import credentials, auth, firestore

from telegram import (
    Update,
    ReplyKeyboardMarkup,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
)
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("progtype-bot")

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_IDS_RAW = os.environ.get("ADMIN_TELEGRAM_IDS", "")
ADMIN_IDS = {
    int(x.strip())
    for x in ADMIN_IDS_RAW.split(",")
    if x.strip().isdigit()
}

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN env var is required")

if not ADMIN_IDS:
    log.warning(
        "ADMIN_TELEGRAM_IDS is empty — no one will be able to use admin commands"
    )

# Firebase Admin SDK initialization
FIREBASE_SA_RAW = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "")
if not FIREBASE_SA_RAW:
    raise RuntimeError(
        "FIREBASE_SERVICE_ACCOUNT env var is required "
        "(paste full JSON content of the service account key)"
    )

try:
    cred_dict = json.loads(FIREBASE_SA_RAW)
except json.JSONDecodeError as e:
    raise RuntimeError(f"FIREBASE_SERVICE_ACCOUNT is not valid JSON: {e}")

cred = credentials.Certificate(cred_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def is_admin_user(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def get_creator_by_telegram_id(telegram_id: int):
    """Return creator doc dict by telegramId field, or None."""
    snap = (
        db.collection("creators")
        .where("telegramId", "==", str(telegram_id))
        .limit(1)
        .stream()
    )
    for doc in snap:
        return {"uid": doc.id, **doc.to_dict()}
    return None


def get_creator_by_email(email: str):
    """Return creator doc dict by email field, or None."""
    snap = (
        db.collection("creators")
        .where("email", "==", email)
        .limit(1)
        .stream()
    )
    for doc in snap:
        return {"uid": doc.id, **doc.to_dict()}
    return None


def get_day_key(ts_ms: int) -> str:
    d = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    return d.strftime("%Y-%m-%d")


async def send_long(update: Update, text: str, parse_mode: str = "HTML") -> None:
    """Telegram limit is 4096 chars per message. Split long text."""
    if not text:
        return
    chunks = [text[i : i + 4000] for i in range(0, len(text), 4000)]
    for chunk in chunks:
        await update.message.reply_text(chunk, parse_mode=parse_mode)


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    tg_id = user.id if user else 0
    is_admin = is_admin_user(tg_id)
    creator = get_creator_by_telegram_id(tg_id)

    name = user.full_name if user else "незнакомец"

    if is_admin:
        role = "супер-администратор"
    elif creator and creator.get("active"):
        role = f"создатель «{creator.get('displayName', '?')}»"
    else:
        role = "гость (нет прав)"

    text = (
        f"👋 Привет, {name}!\n\n"
        f"Твой статус: <b>{role}</b>\n\n"
        f"Это бот управления платформой <b>progtype</b>.\n"
        f"• Создатели могут смотреть свою аналитику через /my_analytics\n"
        f"• Админы могут создавать создателей через /add_creator\n"
        f"• Команда /help покажет все возможности\n\n"
        f"Сайт: https://vfyov6621-coder.github.io/progtype/"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tg_id = update.effective_user.id
    is_admin = is_admin_user(tg_id)
    creator = get_creator_by_telegram_id(tg_id)
    is_creator = bool(creator and creator.get("active"))

    lines = [
        "📚 <b>Команды бота progtype</b>\n",
        "<b>Доступно всем:</b>",
        "/start — приветствие и статус",
        "/help — этот список",
        "/stats — общая статистика платформы\n",
    ]

    if is_creator and not is_admin:
        lines += [
            "<b>Для создателей:</b>",
            "/my_articles — список ваших статей",
            "/my_analytics — аналитика по вашим статьям\n",
        ]

    if is_admin:
        lines += [
            "<b>Для админов:</b>",
            "/creators — список всех создателей",
            "/add_creator email password displayName — создать создателя",
            "/del_creator email — деактивировать создателя",
            "/analytics — общая аналитика по всем статьям",
            "/analytics_7d — аналитика за 7 дней",
            "/analytics_30d — аналитика за 30 дней",
        ]

    await send_long(update, "\n".join(lines))


async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Quick stats — available to anyone."""
    try:
        creators_snap = db.collection("creators").stream()
        creators = [d.to_dict() for d in creators_snap]
        active_creators = sum(1 for c in creators if c.get("active"))

        articles_snap = db.collection("articles").stream()
        articles = [d.to_dict() for d in articles_snap]
        published = sum(1 for a in articles if a.get("published"))
        total_views = sum(a.get("views", 0) for a in articles)

        text = (
            "📊 <b>Статистика progtype</b>\n\n"
            f"👥 Создателей: <b>{len(creators)}</b> (активных: {active_creators})\n"
            f"📝 Статей: <b>{len(articles)}</b> (опубликовано: {published})\n"
            f"👁 Всего просмотров: <b>{total_views}</b>\n"
        )
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        log.exception("stats failed")
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_creators(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """List all creators — admin only."""
    tg_id = update.effective_user.id
    if not is_admin_user(tg_id):
        await update.message.reply_text("🚫 Только для администраторов.")
        return

    try:
        snap = db.collection("creators").order_by("createdAt").stream()
        rows = []
        for d in snap:
            c = d.to_dict()
            status = "✅" if c.get("active") else "❌"
            tg = c.get("telegramId") or "—"
            rows.append(
                f"{status} <b>{c.get('displayName', '?')}</b>\n"
                f"   email: {c.get('email', '?')}\n"
                f"   tg: {tg}  |  uid: <code>{d.id}</code>"
            )
        if not rows:
            await update.message.reply_text("Создателей пока нет.")
            return
        text = "👥 <b>Создатели progtype</b>\n\n" + "\n\n".join(rows)
        await send_long(update, text)
    except Exception as e:
        log.exception("creators failed")
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_add_creator(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Create new creator — admin only.
    Usage: /add_creator email password displayName
    """
    tg_id = update.effective_user.id
    if not is_admin_user(tg_id):
        await update.message.reply_text("🚫 Только для администраторов.")
        return

    args = ctx.args
    if len(args) < 3:
        await update.message.reply_text(
            "Использование:\n"
            "<code>/add_creator email password displayName</code>\n\n"
            "Пример:\n"
            "<code>/add_creator john@progtype.app secretpass123 John Doe</code>",
            parse_mode="HTML",
        )
        return

    email = args[0].strip().lower()
    password = args[1]
    display_name = " ".join(args[2:]).strip()

    if len(password) < 8:
        await update.message.reply_text("Пароль должен быть минимум 8 символов.")
        return

    admin_username = update.effective_user.username or str(update.effective_user.id)

    try:
        # Check if email already exists
        existing = get_creator_by_email(email)
        if existing:
            await update.message.reply_text(
                f"❌ Создатель с email {email} уже существует."
            )
            return

        # 1) Create Firebase Auth user
        try:
            user_record = auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
            )
        except auth.EmailAlreadyExistsError:
            # User exists in Auth but not in /creators — link by uid
            user_record = auth.get_user_by_email(email)
            log.info(
                "Auth user %s already existed, reusing uid=%s",
                email,
                user_record.uid,
            )
        except Exception as e:
            await update.message.reply_text(f"❌ Firebase Auth error: {e}")
            return

        # 2) Create /creators/{uid} document
        now = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
        db.collection("creators").document(user_record.uid).set(
            {
                "uid": user_record.uid,
                "email": email,
                "displayName": display_name,
                "telegramId": "",
                "createdAt": now,
                "createdBy": admin_username,
                "active": True,
                "role": "creator",
            }
        )

        await update.message.reply_text(
            f"✅ Создатель создан!\n\n"
            f"Имя: <b>{display_name}</b>\n"
            f"Email: {email}\n"
            f"UID: <code>{user_record.uid}</code>\n\n"
            f"🔑 Пароль: <code>{password}</code>\n"
            f"⚠️ Сообщите пароль создателю лично и попросите сменить его после входа.\n\n"
            f"Вход на сайт: https://vfyov6621-coder.github.io/progtype/#/login",
            parse_mode="HTML",
        )
    except Exception as e:
        log.exception("add_creator failed")
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_del_creator(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Deactivate creator (set active=false) — admin only.
    Usage: /del_creator email
    """
    tg_id = update.effective_user.id
    if not is_admin_user(tg_id):
        await update.message.reply_text("🚫 Только для администраторов.")
        return

    if not ctx.args:
        await update.message.reply_text(
            "Использование: <code>/del_creator email</code>",
            parse_mode="HTML",
        )
        return

    email = ctx.args[0].strip().lower()
    try:
        creator = get_creator_by_email(email)
        if not creator:
            await update.message.reply_text(f"❌ Создатель с email {email} не найден.")
            return

        # Deactivate (don't delete — keep history)
        db.collection("creators").document(creator["uid"]).update({"active": False})

        # Optionally disable Firebase Auth user
        try:
            auth.update_user(creator["uid"], disabled=True)
        except Exception as e:
            log.warning("Could not disable Auth user %s: %s", creator["uid"], e)

        await update.message.reply_text(
            f"✅ Создатель {email} деактивирован. "
            f"Вход на сайт заблокирован. Статьи сохранены."
        )
    except Exception as e:
        log.exception("del_creator failed")
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_analytics(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """General analytics — admin sees all, creator sees own."""
    tg_id = update.effective_user.id
    is_admin = is_admin_user(tg_id)
    creator = get_creator_by_telegram_id(tg_id)

    if not (is_admin or (creator and creator.get("active"))):
        await update.message.reply_text("🚫 Доступ только для админов и создателей.")
        return

    days = 30
    if ctx.args and ctx.args[0].endswith("d") and ctx.args[0][:-1].isdigit():
        days = int(ctx.args[0][:-1])
    days = max(1, min(days, 90))

    try:
        now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
        start_ms = now_ms - days * 24 * 60 * 60 * 1000
        start_key = get_day_key(start_ms)

        # Query view events
        views_q = (
            db.collection("article_views")
            .where("dayKey", ">=", start_key)
            .stream()
        )

        # For creators: filter to only their articles
        creator_uid = None if is_admin else creator["uid"]
        creator_slugs = set()
        if creator_uid:
            arts = (
                db.collection("articles")
                .where("creatorId", "==", creator_uid)
                .stream()
            )
            for a in arts:
                creator_slugs.add(a.id)

        by_day = defaultdict(int)
        by_article = defaultdict(int)
        total = 0
        for v in views_q:
            data = v.to_dict()
            slug = data.get("slug", "")
            if creator_uid and slug not in creator_slugs:
                continue
            day = data.get("dayKey", "")
            by_day[day] += 1
            by_article[slug] += 1
            total += 1

        # Get article titles
        titles = {}
        for slug in by_article:
            doc = db.collection("articles").document(slug).get()
            if doc.exists:
                titles[slug] = doc.to_dict().get("title", slug)

        # Build text
        if is_admin:
            header = f"📈 <b>Аналитика progtype</b> (за {days} дней)\n\n"
        else:
            header = (
                f"📈 <b>Аналитика по вашим статьям</b> (за {days} дней)\n\n"
            )

        lines = [header, f"👁 Всего просмотров: <b>{total}</b>\n"]

        if by_day:
            sorted_days = sorted(by_day.keys())
            max_v = max(by_day.values()) or 1
            lines.append("📅 <b>По дням:</b>")
            for day in sorted_days[-14:]:  # last 14 days only
                v = by_day[day]
                bar = "█" * max(1, int(v / max_v * 20))
                lines.append(f"  {day}: {bar} {v}")
            lines.append("")

        if by_article:
            lines.append("📝 <b>Топ статей:</b>")
            sorted_arts = sorted(by_article.items(), key=lambda x: -x[1])[:10]
            for slug, v in sorted_arts:
                title = titles.get(slug, slug)
                if len(title) > 40:
                    title = title[:37] + "…"
                lines.append(f"  • {title}: <b>{v}</b>")

        await send_long(update, "\n".join(lines))
    except Exception as e:
        log.exception("analytics failed")
        await update.message.reply_text(f"Ошибка: {e}")


async def cmd_my_articles(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """List creator's own articles."""
    tg_id = update.effective_user.id
    creator = get_creator_by_telegram_id(tg_id)
    is_admin = is_admin_user(tg_id)

    if not (creator or is_admin):
        await update.message.reply_text("🚫 Вы не создатель.")
        return

    uid = creator["uid"] if creator else None
    try:
        if is_admin and ctx.args:
            # Admin can query by email: /my_articles email
            other = get_creator_by_email(ctx.args[0])
            if other:
                uid = other["uid"]

        snap = db.collection("articles").where("creatorId", "==", uid).stream()
        rows = []
        for d in snap:
            a = d.to_dict()
            status = "✅" if a.get("published") else "📝"
            rows.append(
                f"{status} <b>{a.get('title', '?')}</b>\n"
                f"   /{d.id} · {a.get('views', 0)} просм."
            )
        if not rows:
            await update.message.reply_text("У вас пока нет статей.")
            return
        text = "📝 <b>Ваши статьи</b>\n\n" + "\n\n".join(rows)
        await send_long(update, text)
    except Exception as e:
        log.exception("my_articles failed")
        await update.message.reply_text(f"Ошибка: {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def build_application() -> Application:
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("creators", cmd_creators))
    app.add_handler(CommandHandler("add_creator", cmd_add_creator))
    app.add_handler(CommandHandler("del_creator", cmd_del_creator))
    app.add_handler(CommandHandler("analytics", cmd_analytics))
    app.add_handler(CommandHandler("analytics_7d", lambda u, c: cmd_analytics(u, c)))
    # Trick: set args for analytics_7d
    app.add_handler(
        CommandHandler(
            "analytics_7d",
            lambda u, c: (c.args.append("7d") or None, cmd_analytics(u, c))[1],
        )
    )
    app.add_handler(
        CommandHandler(
            "analytics_30d",
            lambda u, c: (c.args.append("30d") or None, cmd_analytics(u, c))[1],
        )
    )
    app.add_handler(CommandHandler("my_articles", cmd_my_articles))
    app.add_handler(CommandHandler("my_analytics", cmd_analytics))

    return app


def main():
    log.info("Starting progtype bot")
    log.info("Admin IDs: %s", ADMIN_IDS)
    app = build_application()
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
