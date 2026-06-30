// Простой hash-based роутер: #/, #/article/:slug, #/admin, #/admin/new, #/admin/edit/:slug
"use client";

import { useEffect, useState, useCallback } from "react";

export interface Route {
  path: string; // например, "/", "/article/my-slug", "/admin/new"
  segments: string[]; // ["article", "my-slug"]
}

function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, "");
  const raw = h.startsWith("/") ? h : "/" + h;
  const clean = raw.replace(/\/+$/, "");
  const path = clean || "/";
  const segments = path.split("/").filter(Boolean);
  return { path, segments };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { path: "/", segments: [] }
      : parseHash()
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) {
      window.location.hash = "#/";
    }
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const clean = to.startsWith("/") ? to : "/" + to;
    window.location.hash = "#" + clean;
    // Прокрутка наверх при переходе
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return { route, navigate };
}
