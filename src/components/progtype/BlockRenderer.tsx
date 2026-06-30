"use client";

import type { Block } from "@/types";
import { EmbedRenderer } from "./EmbedRenderer";
import { ExternalLink } from "lucide-react";

interface Props {
  block: Block;
}

export function BlockRenderer({ block }: Props) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-bold tracking-tight text-3xl md:text-4xl mt-10 mb-4 leading-tight">
          {block.data.text}
        </h2>
      );
    case "subheading":
      return (
        <h3 className="font-semibold text-xl md:text-2xl mt-6 mb-3 leading-snug">
          {block.data.text}
        </h3>
      );
    case "text":
      return (
        <p className="text-[1.05rem] leading-[1.75] text-foreground/90 mb-5 whitespace-pre-wrap">
          {block.data.text}
        </p>
      );
    case "quote":
      return (
        <blockquote className="my-8 pl-5 border-l-4 border-foreground/30 italic text-lg text-foreground/80">
          <p className="leading-relaxed">{block.data.text}</p>
          {block.data.caption ? (
            <footer className="mt-2 not-italic text-sm text-muted-foreground">
              — {block.data.caption}
            </footer>
          ) : null}
        </blockquote>
      );
    case "image":
      return (
        <figure className="my-8">
          <img
            src={block.data.url}
            alt={block.data.alt || block.data.caption || ""}
            loading="lazy"
            className="w-full rounded-xl border border-border"
          />
          {block.data.caption ? (
            <figcaption className="mt-2 text-sm text-center text-muted-foreground">
              {block.data.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "embed":
      return <EmbedRenderer block={block} />;
    case "divider":
      return <hr className="my-10 border-border" />;
    case "code":
      return (
        <pre className="my-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed">
          <code>{block.data.code}</code>
        </pre>
      );
    default:
      return null;
  }
}

export function BlockAddHint({ url }: { url?: string }) {
  return (
    <a
      href={url || "#"}
      target={url ? "_blank" : undefined}
      rel={url ? "noreferrer noopener" : undefined}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ExternalLink className="h-3 w-3" /> открыть оригинал
    </a>
  );
}
