"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/types";
import { getAllArticles, deleteArticle } from "@/lib/articles";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  onNavigate: (to: string) => void;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminDashboard({ onNavigate }: Props) {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const reload = () => {
    setArticles(null);
    getAllArticles()
      .then(setArticles)
      .catch((e) => {
        toast.error("Не удалось загрузить: " + e.message);
        setArticles([]);
      });
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (slug: string) => {
    setDeleting(slug);
    try {
      await deleteArticle(slug);
      toast.success("Статья удалена");
      reload();
    } catch (e) {
      toast.error("Не удалось удалить: " + (e as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Доступ только для админа.</p>
        <Button onClick={() => onNavigate("/login")}>Войти</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Кабинет</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление статьями krestype
          </p>
        </div>
        <Button onClick={() => onNavigate("/admin/new")}>
          <Plus className="h-4 w-4 mr-1.5" /> Новая статья
        </Button>
      </div>

      {articles === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">Пока нет ни одной статьи.</p>
          <Button onClick={() => onNavigate("/admin/new")}>
            <Plus className="h-4 w-4 mr-1.5" /> Создать первую
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 border border-border rounded-lg p-4 hover:bg-muted/30 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{a.title}</h3>
                  {a.published ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Eye className="h-3 w-3" /> Опубл.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <EyeOff className="h-3 w-3" /> Черновик
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(a.createdAt)}</span>
                  <span>·</span>
                  <span>{a.views} просм.</span>
                  <span>·</span>
                  <span className="truncate">/{a.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigate(`/article/${a.slug}`)}
                  title="Открыть"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigate(`/admin/edit/${a.slug}`)}
                  title="Редактировать"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deleting === a.slug}
                      title="Удалить"
                    >
                      {deleting === a.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Статья «{a.title}» будет удалена безвозвратно.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(a.slug)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
