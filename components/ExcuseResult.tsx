"use client";

import { useEffect, useState } from "react";

interface ExcuseResultProps {
  excuse: string;
  contextLabel: string;
  generating: boolean;
  error: string | null;
  onRegenerate: () => void;
  onStartOver: () => void;
}

export function ExcuseResult({
  excuse,
  contextLabel,
  generating,
  error,
  onRegenerate,
  onStartOver,
}: ExcuseResultProps) {
  const [copied, setCopied] = useState(false);

  // Reset the "Copied!" confirmation after 2s.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(excuse);
      setCopied(true);
    } catch {
      // Clipboard can fail (permissions / insecure context); ignore silently.
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: excuse });
      } catch {
        // User cancelled or share failed — no action needed.
      }
    } else {
      // Desktop fallback: copy instead.
      copyToClipboard();
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-2xl border border-black/10 bg-black/[.03] p-6 dark:border-white/10 dark:bg-white/[.04]">
        <p className="text-xl leading-relaxed">{excuse}</p>
      </div>

      <p className="text-xs text-black/50 dark:text-white/50">{contextLabel}</p>

      {error && (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRegenerate}
          disabled={generating}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {generating ? "Cooking…" : "Regenerate"}
        </button>
        <button
          onClick={copyToClipboard}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={share}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Share
        </button>
        <button
          onClick={onStartOver}
          className="rounded-full px-4 py-2 text-sm font-medium text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
