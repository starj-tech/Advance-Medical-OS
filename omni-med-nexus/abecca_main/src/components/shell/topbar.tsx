"use client";

import { Bell, Menu, Search } from "lucide-react";
import { initials } from "@/lib/utils";

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

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search patients, codes…"
            aria-label="Search"
            className="h-9 w-56 rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" />
        </button>

        <div className="flex items-center gap-2.5 pl-1">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials("Dr Sarah Halim")}
          </span>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-sm font-medium">Dr Sarah Halim</span>
            <span className="text-xs text-muted-foreground">DOC-456</span>
          </div>
        </div>
      </div>
    </header>
  );
}
