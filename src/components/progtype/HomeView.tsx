"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/types";
import { getPublishedArticles } from "@/lib/articles";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Eye, ArrowRight } from "lucide-react";

interface Props {
  onNavigate: (to: string) => void;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getFirstText(blocks: Article["blocks"]): string {
  for (const b of blocks) {
    if ((b.type === "text" || b.type === "quote") && b.data.text) {
      return b.data.text.slice(0, 200);
    }
  }
  return "";
}

export function HomeView({ onNavigate }: Props) {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublishedArticles()
      .then((res) => {
        if (!cancelled) setArticles(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Не удалось загрузить статьи");
          setArticles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3">
          progtype
        </h1>
        <p className="text-muted-foreground text-lg">
          Статьи, заметки и встроенные веб-страницы — в одном месте.
        </p>
      </header>

      {articles === null ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border pb-6">
              <Skeleton className="h-7 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {error
            ? `Ошибка: ${error}`
            : "Пока нет опубликованных статей. Загляните позже."}
        </div>
      ) : (
        <ul className="space-y-1">
          {articles.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => onNavigate(`/article/${a.slug}`)}
                className="group block w-full text-left border-b border-border py-6 transition hover:bg-muted/40 -mx-3 px-3 rounded"
              >
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="text-2xl font-semibold tracking-tight group-hover:underline">
                    {a.title}
                  </h2>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition" />
                </div>
                {a.subtitle ? (
                  <p className="text-muted-foreground mb-2">{a.subtitle}</p>
                ) : null}
                <p className="text-foreground/70 line-clamp-2 mb-3">
                  {getFirstText(a.blocks)}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(a.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {a.views}
                  </span>
                  {a.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-muted text-foreground/70"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
