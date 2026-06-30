"use client";

interface Props {
  onNavigate: (to: string) => void;
}

export function Footer({ onNavigate }: Props) {
  return (
    <footer className="mt-auto border-t border-border bg-muted/20">
      <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <button
          onClick={() => onNavigate("/")}
          className="font-medium text-foreground hover:opacity-80"
        >
          progtype
        </button>
        <p className="text-xs text-center">
          © {new Date().getFullYear()} progtype · Powered by Firebase
        </p>
      </div>
    </footer>
  );
}
