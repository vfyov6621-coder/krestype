// Типы блоков контента в статье (Teletype-style)
export type BlockType =
  | "text"
  | "heading"
  | "subheading"
  | "quote"
  | "image"
  | "embed"
  | "divider"
  | "code";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  data: { text: string };
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  data: { text: string };
}

export interface SubheadingBlock extends BaseBlock {
  type: "subheading";
  data: { text: string };
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  data: { text: string; caption?: string };
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  data: { url: string; caption?: string; alt?: string };
}

export interface EmbedBlock extends BaseBlock {
  type: "embed";
  data: {
    url: string;
    caption?: string;
    height?: number; // в пикселях, по умолчанию 480
  };
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  data: Record<string, never>;
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  data: { code: string; language?: string };
}

export type Block =
  | TextBlock
  | HeadingBlock
  | SubheadingBlock
  | QuoteBlock
  | ImageBlock
  | EmbedBlock
  | DividerBlock
  | CodeBlock;

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  coverImage?: string;
  authorName: string;
  authorAvatar?: string;
  tags: string[];
  blocks: Block[];
  published: boolean;
  createdAt: number; // unix ms
  updatedAt: number; // unix ms
  views: number;
}

// Для создания новой статьи (без id — Firestore сгенерирует)
export type ArticleInput = Omit<Article, "id" | "createdAt" | "updatedAt" | "views"> &
  Partial<Pick<Article, "views">>;
