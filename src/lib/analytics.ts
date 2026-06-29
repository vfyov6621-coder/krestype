// Аналитика просмотров статей.
// Коллекция /article_views — каждый документ = одно событие просмотра.
// { slug, title, timestamp }
//
// Запись: публичная (любой посетитель создает событие при чтении статьи).
// Чтение: только krestype admin (см. firestore.rules).
//
// Чтобы не упереться в лимиты Firestore (50K writes/день на free tier),
// мы НЕ записываем событие, если пользователь уже смотрел эту статью
// за последние 30 минут (храним в localStorage).

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Article } from "@/types";

const VIEWS_COLLECTION = "article_views";
const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 минут

/**
 * Записывает событие просмотра статьи.
 * Дедупликация: не пишет, если тот же браузер уже смотрел эту статью
 * за последние 30 минут (хранится в localStorage).
 */
export async function recordView(slug: string, title: string): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    const key = `krestype_view_${slug}`;
    const last = Number(localStorage.getItem(key) || "0");
    const now = Date.now();
    if (now - last < DEDUP_WINDOW_MS) return; // дедупликация

    localStorage.setItem(key, String(now));

    await addDoc(collection(db, VIEWS_COLLECTION), {
      slug,
      title,
      timestamp: now,
      // day_key — для удобной агрегации 'YYYY-MM-DD'
      dayKey: formatDayKey(now),
      createdAt: serverTimestamp(),
    });
  } catch {
    // fail silent — аналитика не должна ломать чтение статьи
  }
}

function formatDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DailyViews {
  dayKey: string; // YYYY-MM-DD
  date: Date;
  count: number;
}

export interface ArticleViewsStat {
  slug: string;
  title: string;
  views: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  viewsToday: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  totalArticles: number;
  publishedArticles: number;
  uniqueDaysActive: number;
}

/**
 * Возвращает просмотры по дням за последние N дней.
 * Делает один запрос с where("dayKey", ">=", ...) — нужен составной индекс.
 */
export async function getViewsByDay(days: number = 30): Promise<DailyViews[]> {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  const startKey = formatDayKey(startMs);

  const q = query(
    collection(db, VIEWS_COLLECTION),
    where("dayKey", ">=", startKey)
  );
  const snap = await getDocs(q);

  // Агрегируем на клиенте — для 30 дней × 1000 просмотров = 30K документов это ок
  const byDay = new Map<string, number>();
  snap.forEach((doc) => {
    const data = doc.data();
    const dayKey: string = data.dayKey || formatDayKey(data.timestamp || 0);
    byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
  });

  // Заполняем пропущенные дни нулями
  const result: DailyViews[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const ms = now - i * 24 * 60 * 60 * 1000;
    const dayKey = formatDayKey(ms);
    result.push({
      dayKey,
      date: new Date(ms),
      count: byDay.get(dayKey) || 0,
    });
  }
  return result;
}

/**
 * Возвращает топ статей по просмотрам за последние N дней.
 */
export async function getTopArticles(
  days: number = 30,
  topN: number = 10
): Promise<ArticleViewsStat[]> {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  const startKey = formatDayKey(startMs);

  const q = query(
    collection(db, VIEWS_COLLECTION),
    where("dayKey", ">=", startKey)
  );
  const snap = await getDocs(q);

  const byArticle = new Map<string, ArticleViewsStat>();
  snap.forEach((d) => {
    const data = d.data();
    const slug: string = data.slug || "";
    const title: string = data.title || slug;
    const existing = byArticle.get(slug);
    if (existing) {
      existing.views += 1;
    } else {
      byArticle.set(slug, { slug, title, views: 1 });
    }
  });

  return Array.from(byArticle.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, topN);
}

/**
 * Сводная статистика для дашборда.
 */
export async function getAnalyticsSummary(
  articles: Article[]
): Promise<AnalyticsSummary> {
  const now = Date.now();
  const todayKey = formatDayKey(now);
  const last7DaysMs = now - 7 * 24 * 60 * 60 * 1000;
  const last30DaysMs = now - 30 * 24 * 60 * 60 * 1000;
  const last7DaysKey = formatDayKey(last7DaysMs);
  const last30DaysKey = formatDayKey(last30DaysMs);

  // Запрос всех событий (для полноценной аналитики)
  // Если будет очень много — нужно будет агрегировать в /analytics_daily
  const q = query(
    collection(db, VIEWS_COLLECTION),
    where("dayKey", ">=", last30DaysKey)
  );
  const snap = await getDocs(q);

  let totalViews = 0;
  let viewsToday = 0;
  let viewsLast7Days = 0;
  let viewsLast30Days = 0;
  const daysActive = new Set<string>();

  snap.forEach((d) => {
    const data = d.data();
    const dayKey: string = data.dayKey || "";
    totalViews += 1;
    daysActive.add(dayKey);
    if (dayKey === todayKey) viewsToday += 1;
    if (dayKey >= last7DaysKey) viewsLast7Days += 1;
    if (dayKey >= last30DaysKey) viewsLast30Days += 1;
  });

  return {
    totalViews,
    viewsToday,
    viewsLast7Days,
    viewsLast30Days,
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.published).length,
    uniqueDaysActive: daysActive.size,
  };
}

/**
 * Получает последние N событий просмотров — для активности в реальном времени.
 */
export async function getRecentViews(
  count: number = 20
): Promise<
  Array<{ slug: string; title: string; timestamp: number }>
> {
  const q = query(
    collection(db, VIEWS_COLLECTION),
    orderBy("timestamp", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      slug: data.slug || "",
      title: data.title || "",
      timestamp: data.timestamp || 0,
    };
  });
}
