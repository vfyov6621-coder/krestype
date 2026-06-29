"use client";

import { useEffect, useState } from "react";
import type { EmbedBlock } from "@/types";
import { ExternalLink, Loader2 } from "lucide-react";

interface Props {
  block: EmbedBlock;
}

/**
 * Рендерит встроенный сайт по URL через iframe.
 * Многие сайты (Google, Twitter, YouTube на нек. доменах) запрещают встраивание
 * через X-Frame-Options / CSP frame-ancestors. Мы не можем заранее узнать,
 * разрешает ли сайт встраивание, поэтому используем onLoad/onError + fallback.
 */
export function EmbedRenderer({ block }: Props) {
  const { url, caption, height = 480 } = block.data;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Сбрасываем состояние при смене URL
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    const t = setTimeout(() => {
      // Если через 8 секунд iframe не загрузился — показываем fallback
      setLoading(false);
    }, 8000);
    return () => clearTimeout(t);
  }, [url]);

  // Проверяем валидность URL
  let validUrl: URL | null = null;
  try {
    validUrl = new URL(url);
  } catch {
    validUrl = null;
  }

  if (!validUrl) {
    return (
      <div className="my-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Некорректный URL: <code className="break-all">{url}</code>
      </div>
    );
  }

  return (
    <figure className="my-8">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border bg-muted"
        style={{ height: `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted pointer-events-none">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={url}
          title={caption || validUrl.hostname}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          className="h-full w-full"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
            <p className="text-sm text-foreground/80">
              Сайт <strong>{validUrl.hostname}</strong> запрещает встраивание
              (X-Frame-Options / CSP).
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4"
            >
              <ExternalLink className="h-4 w-4" /> Открыть в новой вкладке
            </a>
          </div>
        )}
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-center text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
