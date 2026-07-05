"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, RefreshCw, RotateCcw, Share2 } from "lucide-react";

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
      // Clipboard can fail on insecure contexts; ignore silently.
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
      copyToClipboard();
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <motion.div
        key={excuse}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="rounded-3xl border border-border bg-surface p-6 shadow-card"
      >
        <p className="text-xl font-medium leading-relaxed">{excuse}</p>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          {contextLabel}
        </p>
      </motion.div>

      {error && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <ActionButton onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="h-4 w-4 text-success" aria-hidden />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy
            </>
          )}
        </ActionButton>

        <ActionButton onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </ActionButton>

        <ActionButton onClick={onRegenerate} disabled={generating}>
          <RefreshCw
            className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
            aria-hidden
          />
          {generating ? "…" : "Redo"}
        </ActionButton>
      </div>

      <button
        onClick={onStartOver}
        className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Start over
      </button>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-hover disabled:opacity-50"
    >
      {children}
    </motion.button>
  );
}
