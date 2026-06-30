"use client";

import { useEffect, useState } from "react";
import type { Article, ArticleInput, Block } from "@/types";
import {
  getArticleBySlug,
  createArticle,
  updateArticle,
} from "@/lib/articles";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockEditor, createBlock } from "./BlockEditor";
import { ArrowLeft, Save, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Props {
  slug?: string; // если задан — режим редактирования
  onNavigate: (to: string) => void;
}

function defaultArticle(): ArticleInput {
  return {
    slug: "",
    title: "",
    subtitle: "",
    coverImage: "",
    authorName: "progtype",
    authorAvatar: "",
    tags: [],
    blocks: [createBlock("text")],
    published: false,
  };
}

export function EditorView({ slug, onNavigate }: Props) {
  const { isAdmin, isCreator, user, creator } = useAuth();
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ArticleInput>(defaultArticle());
  const [tagsInput, setTagsInput] = useState("");
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      // Новая статья — подставляем creatorId текущего пользователя.
      const uid = user?.uid || "";
      const creatorEmail = user?.email || "";
      const authorName =
        creator?.displayName || (isAdmin ? "progtype admin" : "progtype");
      setData({
        ...defaultArticle(),
        creatorId: uid,
        creatorEmail,
        authorName,
      });
      setTagsInput("");
      setLoading(false);
      return;
    }
    setOriginalSlug(slug);
    getArticleBySlug(slug)
      .then((res) => {
        if (!res) {
          toast.error("Статья не найдена");
          onNavigate("/admin");
          return;
        }
        // Проверка доступа: создатель может редактировать только свою статью,
        // супер-админ — любую.
        if (!isAdmin && res.creatorId && res.creatorId !== user?.uid) {
          toast.error("Нет прав на редактирование этой статьи");
          onNavigate("/admin");
          return;
        }
        const { ...rest } = res;
        setData(rest);
        setTagsInput(rest.tags.join(", "));
      })
      .catch((e) => toast.error("Не удалось загрузить: " + e.message))
      .finally(() => setLoading(false));
  }, [slug, onNavigate, isAdmin, user, creator]);

  if (!isCreator) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">
          Доступ только для создателей.
        </p>
        <Button onClick={() => onNavigate("/login")}>Войти</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const setField = <K extends keyof ArticleInput>(
    key: K,
    value: ArticleInput[K]
  ) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const handleSave = async (publish?: boolean) => {
    if (!data.title.trim()) {
      toast.error("Введите заголовок");
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const payload: ArticleInput = {
        ...data,
        tags,
        published: publish ?? data.published,
      };
      if (originalSlug) {
        await updateArticle(originalSlug, payload);
        toast.success("Сохранено");
        if (publish) onNavigate(`/article/${originalSlug}`);
      } else {
        const newSlug = await createArticle(payload);
        toast.success("Создано");
        onNavigate(`/article/${newSlug}`);
      }
    } catch (e) {
      toast.error("Ошибка сохранения: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("/admin")}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> В кабинет
      </Button>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        {originalSlug ? "Редактирование" : "Новая статья"}
      </h1>

      <div className="space-y-5">
        {/* metadata */}
        <div className="space-y-2">
          <Label htmlFor="title">Заголовок *</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="О чём статья?"
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Подзаголовок</Label>
          <Input
            id="subtitle"
            value={data.subtitle || ""}
            onChange={(e) => setField("subtitle", e.target.value)}
            placeholder="Краткое описание (опционально)"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cover">Обложка (URL)</Label>
            <Input
              id="cover"
              value={data.coverImage || ""}
              onChange={(e) => setField("coverImage", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Автор</Label>
            <Input
              id="author"
              value={data.authorName}
              onChange={(e) => setField("authorName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Теги (через запятую)</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="дизайн, веб, размышления"
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Switch
            id="published"
            checked={data.published}
            onCheckedChange={(v) => setField("published", v)}
          />
          <Label htmlFor="published" className="cursor-pointer">
            Опубликовано (видно всем)
          </Label>
        </div>

        {/* blocks */}
        <div>
          <Label className="mb-2 block">Контент статьи</Label>
          <BlockEditor
            blocks={data.blocks}
            onChange={(blocks: Block[]) => setField("blocks", blocks)}
          />
        </div>

        {/* actions */}
        <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-sm">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Сохранить черновик
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            Опубликовать
          </Button>
        </div>
      </div>
    </div>
  );
}

// Сохраняем Article тип для будущих расширений
export type { Article };
