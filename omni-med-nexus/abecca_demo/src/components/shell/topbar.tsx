"use client";

import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="-ml-1 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <Badge variant="info" className="ml-auto">
        Demo environment
      </Badge>
    </header>
  );
}
