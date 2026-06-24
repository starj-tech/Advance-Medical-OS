"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "./use-theme";
import { setTheme, useTheme } from "./use-theme";

const order: Theme[] = ["light", "dark", "system"];
const icons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const theme = useTheme();
  const Icon = icons[theme];
  const cycle = () =>
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  const label = `Theme: ${theme} (click to change)`;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
