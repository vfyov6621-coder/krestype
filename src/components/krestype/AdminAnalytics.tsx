"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/types";
import { getAllArticles } from "@/lib/articles";
import {
  getViewsByDay,
  getTopArticles,
  getAnalyticsSummary,
  getRecentViews,
  type DailyViews,
  type ArticleViewsStat,
  type AnalyticsSummary,
} from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Eye,
  FileText,
  TrendingUp,
  Calendar,
  Activity,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface Props {
  onNavigate: (to: string) => void;
}

interface RecentView {
  slug: string;
  title: string;
  timestamp: number;
}

const PIE_COLORS = [
  "#0f172a",
  "#1e293b",
  "#334155",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
];

function formatDay(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} сек назад`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  return `${day} дн назад`;
}

export function AdminAnalytics({ onNavigate }: Props) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [daily, setDaily] = useState<DailyViews[]>([]);
  const [topArticles, setTopArticles] = useState<ArticleViewsStat[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<RecentView[]>([]);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const reload = async () => {
    setLoading(true);
    try {
      const arts = await getAllArticles();
      setArticles(arts);
      const [d, t, s, r] = await Promise.all([
        getViewsByDay(range),
        getTopArticles(range, 8),
        getAnalyticsSummary(arts),
        getRecentViews(20),
      ]);
      setDaily(d);
      setTopArticles(t);
      setSummary(s);
      setRecent(r);
    } catch (e) {
      toast.error("Не удалось загрузить аналитику: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    reload();
  }, [isAdmin, range]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">Доступ только для админа.</p>
        <Button onClick={() => onNavigate("/login")}>Войти</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("/admin")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> В кабинет
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Аналитика</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Просмотры статей и активность читателей
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={String(range)}
            onValueChange={(v) => setRange(Number(v) as 7 | 30 | 90)}
          >
            <TabsList>
              <TabsTrigger value="7">7 дн</TabsTrigger>
              <TabsTrigger value="30">30 дн</TabsTrigger>
              <TabsTrigger value="90">90 дн</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={reload} title="Обновить">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              icon={Eye}
              label="Всего просмотров"
              value={summary?.totalViews ?? 0}
              hint="за 30 дней"
              color="text-blue-600"
            />
            <StatCard
              icon={Calendar}
              label="Просмотров сегодня"
              value={summary?.viewsToday ?? 0}
              hint={new Date().toLocaleDateString("ru-RU")}
              color="text-green-600"
            />
            <StatCard
              icon={TrendingUp}
              label="За 7 дней"
              value={summary?.viewsLast7Days ?? 0}
              hint="неделя"
              color="text-orange-600"
            />
            <StatCard
              icon={FileText}
              label="Опубликовано статей"
              value={summary?.publishedArticles ?? 0}
              hint={`из ${summary?.totalArticles ?? 0} всего`}
              color="text-purple-600"
            />
          </div>

          <Tabs defaultValue="views">
            <TabsList className="mb-4">
              <TabsTrigger value="views">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Просмотры
              </TabsTrigger>
              <TabsTrigger value="articles">
                <FileText className="h-4 w-4 mr-1.5" />
                Статьи
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="h-4 w-4 mr-1.5" />
                Активность
              </TabsTrigger>
            </TabsList>

            {/* VIEWS TAB */}
            <TabsContent value="views" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Просмотры по дням</CardTitle>
                  <CardDescription>
                    Динамика просмотров за последние {range} дней
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={daily}>
                      <defs>
                        <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="dayKey"
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return formatDay(d);
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        labelFormatter={(v) => {
                          const d = new Date(v as string);
                          return d.toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        }}
                        formatter={(v: number) => [v, "Просмотров"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#0f172a"
                        strokeWidth={2}
                        fill="url(#viewsGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Последняя активность</CardTitle>
                  <CardDescription>
                    20 последних просмотров в реальном времени
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Пока нет просмотров.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                      {recent.map((v, i) => (
                        <li
                          key={i}
                          className="py-2 flex items-center justify-between gap-3"
                        >
                          <button
                            onClick={() => onNavigate(`/article/${v.slug}`)}
                            className="flex-1 text-left truncate hover:underline"
                            title={v.title}
                          >
                            {v.title}
                          </button>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {timeAgo(v.timestamp)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ARTICLES TAB */}
            <TabsContent value="articles" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Топ статей по просмотрам</CardTitle>
                    <CardDescription>
                      За последние {range} дней
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topArticles.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        Нет данных за период.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={topArticles}
                          layout="vertical"
                          margin={{ left: 20, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis
                            type="category"
                            dataKey="title"
                            tick={{ fontSize: 11 }}
                            width={120}
                            tickFormatter={(v) =>
                              v.length > 18 ? v.slice(0, 18) + "…" : v
                            }
                          />
                          <Tooltip
                            formatter={(v: number) => [v, "Просмотров"]}
                          />
                          <Bar
                            dataKey="views"
                            fill="#0f172a"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Доля просмотров</CardTitle>
                    <CardDescription>
                      Распределение по топ-статьям
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topArticles.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        Нет данных за период.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={topArticles}
                            dataKey="views"
                            nameKey="title"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) =>
                              `${name.length > 14 ? name.slice(0, 14) + "…" : name}: ${value}`
                            }
                          >
                            {topArticles.map((_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Все статьи</CardTitle>
                  <CardDescription>
                    Полный список с количеством просмотров (из счётчика)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {articles
                      .slice()
                      .sort((a, b) => b.views - a.views)
                      .map((a) => (
                        <li
                          key={a.id}
                          className="py-2 flex items-center justify-between gap-3"
                        >
                          <button
                            onClick={() => onNavigate(`/article/${a.slug}`)}
                            className="flex-1 text-left truncate hover:underline"
                          >
                            {a.title}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {a.published ? "опубл." : "черновик"}
                          </span>
                          <span className="text-sm font-semibold tabular-nums w-16 text-right">
                            {a.views} 🔎
                          </span>
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={Calendar}
                  label="Активных дней"
                  value={summary?.uniqueDaysActive ?? 0}
                  hint="за 30 дней"
                  color="text-blue-600"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Среднее в день"
                  value={
                    summary && summary.uniqueDaysActive > 0
                      ? Math.round(summary.viewsLast30Days / summary.uniqueDaysActive)
                      : 0
                  }
                  hint="за 30 дней"
                  color="text-green-600"
                />
                <StatCard
                  icon={FileText}
                  label="Просм. на статью"
                  value={
                    summary && summary.publishedArticles > 0
                      ? Math.round(summary.viewsLast30Days / summary.publishedArticles)
                      : 0
                  }
                  hint="среднее"
                  color="text-orange-600"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Лента просмотров</CardTitle>
                  <CardDescription>
                    Хронологический список событий просмотров
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Пока нет просмотров.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border max-h-[500px] overflow-y-auto">
                      {recent.map((v, i) => (
                        <li
                          key={i}
                          className="py-3 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => onNavigate(`/article/${v.slug}`)}
                              className="text-left font-medium hover:underline truncate block"
                            >
                              {v.title}
                            </button>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTime(v.timestamp)} · {timeAgo(v.timestamp)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  hint?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, hint, color = "text-foreground" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {hint ? (
          <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
