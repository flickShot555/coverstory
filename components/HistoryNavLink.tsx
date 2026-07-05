"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** History icon button in the nav — shown only when signed in. */
export function HistoryNavLink() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link
      href="/history"
      aria-label="History"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-hover"
    >
      <History className="h-4 w-4" aria-hidden />
    </Link>
  );
}
