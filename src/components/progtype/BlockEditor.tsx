"use client";

import { useState } from "react";
import type { Block, BlockType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Heading,
  Image as ImageIcon,
  Code as CodeIcon,
  Link2,
  Quote,
  Minus,
} from "lucide-react";
import { BlockRenderer } from "./BlockRenderer";

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

export function createBlock(type: BlockType): Block {
  const id = uid();
  switch (type) {
    case "text":
      return { id, type, data: { text: "" } };
    case "heading":
      return { id, type, data: { text: "" } };
    case "subheading":
      return { id, type, data: { text: "" } };
    case "quote":
      return { id, type, data: { text: "", caption: "" } };
    case "image":
      return { id, type, data: { url: "", caption: "", alt: "" } };
    case "embed":
      return { id, type, data: { url: "", caption: "", height: 480 } };
    case "divider":
      return { id, type, data: {} };
    case "code":
      return { id, type, data: { code: "", language: "" } };
  }
}

const BLOCK_OPTIONS: { value: BlockType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Текст", icon: Type },
  { value: "heading", label: "Заголовок", icon: Heading },
  { value: "subheading", label: "Подзаголовок", icon: Heading },
  { value: "quote", label: "Цитата", icon: Quote },
  { value: "image", label: "Картинка", icon: ImageIcon },
  { value: "embed", label: "Веб-страница (URL)", icon: Link2 },
  { value: "code", label: "Код", icon: CodeIcon },
  { value: "divider", label: "Разделитель", icon: Minus },
];

export function BlockEditor({ blocks, onChange }: Props) {
  const [addingAt, setAddingAt] = useState<number | null>(null);
  const [addType, setAddType] = useState<BlockType>("text");

  const update = (id: string, patch: Partial<Block>) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as Block) : b
      )
    );
  };

  const updateData = (id: string, dataPatch: Record<string, unknown>) => {
    onChange(
      blocks.map((b) =>
        b.id === id
          ? ({ ...b, data: { ...b.data, ...dataPatch } } as Block)
          : b
      )
    );
  };

  const remove = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange(next);
  };

  const addAt = (index: number, type: BlockType) => {
    const block = createBlock(type);
    const next = [...blocks];
    next.splice(index, 0, block);
    onChange(next);
    setAddingAt(null);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg text-muted-foreground">
          Добавьте первый блок — выберите тип ниже
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id} className="rounded-lg border border-border bg-card">
          {/* toolbar */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GripVertical className="h-3.5 w-3.5" />
              <span className="font-medium uppercase tracking-wide">
                {block.type}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(block.id, -1)}
                disabled={idx === 0}
                title="Вверх"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => move(block.id, 1)}
                disabled={idx === blocks.length - 1}
                title="Вниз"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => remove(block.id)}
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* редактор по типу блока */}
          <div className="p-3 space-y-2">
            <BlockFields
              block={block}
              onUpdateData={(p) => updateData(block.id, p)}
            />
          </div>

          {/* превью (кроме divider) */}
          {block.type !== "divider" && (
            <div className="border-t border-border bg-background/50 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Превью
              </div>
              <BlockRenderer block={block} />
            </div>
          )}

          {/* кнопка "добавить ниже" */}
          <div className="border-t border-border bg-muted/20 px-3 py-1.5">
            <button
              onClick={() => {
                setAddingAt(idx + 1);
                setAddType("text");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              + добавить блок ниже
            </button>
          </div>

          {/* inline add UI */}
          {addingAt === idx + 1 && (
            <div className="border-t border-border p-3 bg-muted/40 space-y-2">
              <Label className="text-xs">Тип блока</Label>
              <div className="flex flex-wrap gap-2">
                {BLOCK_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => addAt(idx + 1, opt.value)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-sm transition"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingAt(null)}
              >
                Отмена
              </Button>
            </div>
          )}
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {BLOCK_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => addAt(0, opt.value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent text-sm transition"
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* bottom add */}
      {blocks.length > 0 && addingAt === null && (
        <div className="pt-2">
          <Select
            value={addType}
            onValueChange={(v) => setAddType(v as BlockType)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Добавить блок" />
            </SelectTrigger>
            <SelectContent>
              {BLOCK_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => addAt(blocks.length, addType)}
          >
            Добавить в конец
          </Button>
        </div>
      )}
    </div>
  );
}

interface FieldsProps {
  block: Block;
  onUpdateData: (patch: Record<string, unknown>) => void;
}

function BlockFields({ block, onUpdateData }: FieldsProps) {
  switch (block.type) {
    case "text":
      return (
        <Textarea
          value={block.data.text}
          onChange={(e) => onUpdateData({ text: e.target.value })}
          placeholder="Основной текст абзаца..."
          rows={4}
        />
      );
    case "heading":
      return (
        <Input
          value={block.data.text}
          onChange={(e) => onUpdateData({ text: e.target.value })}
          placeholder="Заголовок (H2)"
        />
      );
    case "subheading":
      return (
        <Input
          value={block.data.text}
          onChange={(e) => onUpdateData({ text: e.target.value })}
          placeholder="Подзаголовок (H3)"
        />
      );
    case "quote":
      return (
        <div className="space-y-2">
          <Textarea
            value={block.data.text}
            onChange={(e) => onUpdateData({ text: e.target.value })}
            placeholder="Текст цитаты..."
            rows={3}
          />
          <Input
            value={block.data.caption || ""}
            onChange={(e) => onUpdateData({ caption: e.target.value })}
            placeholder="Подпись (автор/источник)"
          />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Input
            value={block.data.url}
            onChange={(e) => onUpdateData({ url: e.target.value })}
            placeholder="URL изображения (https://...)"
          />
          <Input
            value={block.data.caption || ""}
            onChange={(e) => onUpdateData({ caption: e.target.value })}
            placeholder="Подпись (опционально)"
          />
          <Input
            value={block.data.alt || ""}
            onChange={(e) => onUpdateData({ alt: e.target.value })}
            placeholder="Alt-текст для доступности"
          />
        </div>
      );
    case "embed":
      return (
        <div className="space-y-2">
          <Input
            value={block.data.url}
            onChange={(e) => onUpdateData({ url: e.target.value })}
            placeholder="URL сайта для встраивания (https://...)"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={block.data.caption || ""}
                onChange={(e) => onUpdateData({ caption: e.target.value })}
                placeholder="Подпись (опционально)"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Высота</Label>
              <Input
                type="number"
                min={200}
                max={1200}
                step={20}
                value={block.data.height ?? 480}
                onChange={(e) =>
                  onUpdateData({ height: Number(e.target.value) || 480 })
                }
                className="w-24"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Многие сайты (Google, YouTube на некоторых доменах, банки) запрещают
            встраивание через X-Frame-Options. В этом случае покажется fallback
            со ссылкойкой «Открыть в новой вкладке».
          </p>
        </div>
      );
    case "code":
      return (
        <div className="space-y-2">
          <Textarea
            value={block.data.code}
            onChange={(e) => onUpdateData({ code: e.target.value })}
            placeholder="Код..."
            rows={6}
            className="font-mono text-sm"
          />
          <Input
            value={block.data.language || ""}
            onChange={(e) => onUpdateData({ language: e.target.value })}
            placeholder="Язык (опционально)"
          />
        </div>
      );
    case "divider":
      return (
        <p className="text-xs text-muted-foreground">
          Горизонтальная линия-разделитель. Без параметров.
        </p>
      );
    default:
      return null;
  }
}
