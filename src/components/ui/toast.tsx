"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";
interface ToastMsg {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

// --- public API ---

let toastId = 0;
const listeners = new Set<(t: ToastMsg) => void>();

export function toast(title: string, description?: string, variant: ToastVariant = "default") {
  const msg: ToastMsg = { id: ++toastId, title, description, variant };
  listeners.forEach((l) => l(msg));
}

// --- component ---

const toastVariantStyle = cva(
  "flex w-full max-w-sm rounded-lg border p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        success: "bg-emerald-50 border-emerald-200 text-emerald-900",
        destructive: "bg-red-50 border-red-200 text-red-900",
        warning: "bg-amber-50 border-amber-200 text-amber-900",
        info: "bg-blue-50 border-blue-200 text-blue-900",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const ICONS: Record<ToastVariant, React.ReactNode | null> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
  destructive: <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />,
  info: <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />,
};

function ToastItem({
  msg,
  onDismiss,
}: {
  msg: ToastMsg;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => {
      clearTimeout(t);
    };
  }, [onDismiss]);

  return (
    <div className={cn(toastVariantStyle({ variant: msg.variant }), "data-[state=open]:slide-in-from-right-full")} data-state="open">
      <div className="flex gap-3 items-start flex-1">
        {ICONS[msg.variant ?? "default"]}
        <div className="flex-1">
          <p className="font-medium text-sm">{msg.title}</p>
          {msg.description && <p className="text-xs mt-0.5 opacity-80">{msg.description}</p>}
        </div>
      </div>
      <button onClick={onDismiss} className="text-current/60 hover:opacity-80 ml-2 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = React.useState<ToastMsg[]>([]);

  React.useEffect(() => {
    const handler = (msg: ToastMsg) => setItems((prev) => [...prev.slice(-4), msg]);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const dismiss = React.useCallback(
    (id: number) => setItems((prev) => prev.filter((m) => m.id !== id)),
    []
  );

  if (!items.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {items.map((m) => (
        <div key={m.id} className="pointer-events-auto">
          <ToastItem msg={m} onDismiss={() => dismiss(m.id)} />
        </div>
      ))}
    </div>
  );
}