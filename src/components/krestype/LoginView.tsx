"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onNavigate: (to: string) => void;
}

export function LoginView({ onNavigate }: Props) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await login(password);
      toast.success("Вход выполнен");
      onNavigate("/admin");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось войти";
      toast.error("Ошибка входа: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold">Вход для админа</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Только для администратора. Публичная регистрация отключена.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Логин</Label>
          <Input
            id="username"
            value="kres"
            disabled
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoFocus
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Войти
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Сессия сохраняется в этом браузере. Не забудьте выйти на чужом
        устройстве.
      </p>
    </div>
  );
}
