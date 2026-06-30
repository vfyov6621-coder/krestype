"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, PenLine, Home, BarChart3 } from "lucide-react";

interface Props {
  onNavigate: (to: string) => void;
  currentPath: string;
}

export function Header({ onNavigate, currentPath }: Props) {
  const { isAdmin, isCreator, logout } = useAuth();
  const isAdminArea = currentPath.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <button
          onClick={() => onNavigate("/")}
          className="font-bold tracking-tight text-lg hover:opacity-80 transition"
        >
          progtype
        </button>

        <nav className="flex items-center gap-1">
          {!isAdminArea && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("/")}
              className="gap-1.5"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Статьи</span>
            </Button>
          )}

          {isCreator ? (
            <>
              {!isAdminArea ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("/admin")}
                  className="gap-1.5"
                >
                  <PenLine className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isAdmin ? "Админ" : "Кабинет"}
                  </span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("/")}
                  className="gap-1.5"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">На сайт</span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("/admin/analytics")}
                  className="gap-1.5"
                  title="Аналитика просмотров"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Аналитика</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  onNavigate("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("/login")}
            >
              Вход
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
