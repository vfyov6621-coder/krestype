// Утилиты для slug и работы со статьями в Firestore
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Article, ArticleInput } from "@/types";

const COLLECTION = "articles";

// Транслитерация кириллицы + slugify
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

export function slugify(input: string): string {
  const lower = input.toLowerCase().trim();
  let out = "";
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) {
      out += TRANSLIT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (/\s/.test(ch) || ch === "-" || ch === "_") {
      out += "-";
    }
    // иначе пропускаем
  }
  out = out.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!out) out = "article";
  return out.slice(0, 80);
}

export async function ensureUniqueSlug(slug: string): Promise<string> {
  const base = slug;
  let candidate = base;
  let n = 2;
  // Проверяем до 10 вариантов
  while (n < 12) {
    const snap = await getDoc(doc(db, COLLECTION, candidate));
    if (!snap.exists()) return candidate;
    candidate = `${base}-${n}`;
    n++;
  }
  // fallback — добавим timestamp
  return `${base}-${Date.now().toString(36)}`;
}

export async function createArticle(input: ArticleInput): Promise<string> {
  const slug = await ensureUniqueSlug(slugify(input.title));
  const now = Date.now();
  const article: Omit<Article, "id"> = {
    ...input,
    slug,
    createdAt: now,
    updatedAt: now,
    views: 0,
  };
  // Используем slug как id документа для красивых URL
  await setDoc(doc(db, COLLECTION, slug), article);
  return slug;
}

export async function updateArticle(
  id: string,
  patch: Partial<ArticleInput>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteArticle(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getArticleBySlug(
  slug: string
): Promise<Article | null> {
  const snap = await getDoc(doc(db, COLLECTION, slug));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Article, "id">) };
}

export async function getAllArticles(): Promise<Article[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Article, "id">),
  }));
}

/**
 * Возвращает статьи конкретного создателя (по uid).
 * Используется в кабинете: создатель видит только свои.
 */
export async function getArticlesByCreator(creatorId: string): Promise<Article[]> {
  const q = query(
    collection(db, COLLECTION),
    where("creatorId", "==", creatorId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Article, "id">),
  }));
}

export async function getPublishedArticles(): Promise<Article[]> {
  const q = query(
    collection(db, COLLECTION),
    where("published", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Article, "id">),
  }));
}

export async function incrementViews(slug: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, slug), {
    views: increment(1),
  });
}

// Заглушка для serverTimestamp — не используется, но оставим для совместимости
export { serverTimestamp };
