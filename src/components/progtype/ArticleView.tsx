"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/types";
import { getArticleBySlug, incrementViews } from "@/lib/articles";
import { recordView } from "@/lib/analytics";
import { BlockRenderer } from "./BlockRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Eye, Edit } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Props {
  slug: string;
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

export function ArticleView({ slug, onNavigate }: Props) {
  const { isAdmin, user } = useAuth();
  // Используем key-based reset: передаём slug как key из родителя,
  // тогда компонент перемонтируется при смене slug и начальное состояние
  // undefined устанавливается один раз.
  const [article, setArticle] = useState<Article | null | undefined>(
    undefined
  );
  const [loadingState, setLoadingState] = useState<"loading" | "done" | "error">(
    "loading"
  );

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingState("loading");
    getArticleBySlug(slug)
      .then((res) => {
        if (!active) return;
        setArticle(res);
        setLoadingState("done");
        // Инкремент просмотров (fire-and-forget) — для счётчика на карточке
        if (res && res.published) {
          incrementViews(slug).catch(() => {});
          // Записываем событие для аналитики (с дедупликацией 30 мин)
          recordView(slug, res.title).catch(() => {});
        }
      })
      .catch(() => {
        if (!active) return;
        setArticle(null);
        setLoadingState("error");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loadingState === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-2">Статья не найдена</h1>
        <p className="text-muted-foreground mb-6">
          Возможно, она была удалена или ещё не опубликована.
        </p>
        <Button onClick={() => onNavigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> На главную
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("/")}
        className="mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Все статьи
      </Button>

      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
          {article.title}
        </h1>
        {article.subtitle ? (
          <p className="text-xl text-muted-foreground mb-5 leading-relaxed">
            {article.subtitle}
          </p>
        ) : null}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(article.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {article.views} просмотров
          </span>
          {article.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full bg-muted text-foreground/70"
            >
              #{t}
            </span>
          ))}
          {(isAdmin || (user && article.creatorId === user.uid)) && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => onNavigate(`/admin/edit/${article.slug}`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Редактировать
            </Button>
          )}
        </div>
      </header>

      {article.coverImage ? (
        <img
          src={article.coverImage}
          alt={article.title}
          className="w-full rounded-xl mb-10 border border-border"
        />
      ) : null}

      <div className="article-body">
        {article.blocks.map((b) => (
          <BlockRenderer key={b.id} block={b} />
        ))}
      </div>

      <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>
          Написано{" "}
          <span className="font-medium text-foreground">
            {article.authorName}
          </span>{" "}
          · {formatDate(article.createdAt)}
        </p>
        <p className="mt-2 text-xs">© progtype</p>
      </footer>
    </article>
  );
}
