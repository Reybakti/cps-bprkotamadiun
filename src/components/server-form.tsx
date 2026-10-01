"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/types/shared";

export type FormAction = (
  prev: ActionResult | null,
  formData: FormData
) => Promise<ActionResult | null>;

interface ServerFormProps {
  action: FormAction;
  onSuccess?: (data?: unknown) => void;
  onError?: (msg: string) => void;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}

export function ServerForm({
  action,
  onSuccess,
  onError,
  children,
  className,
  successMessage,
  resetOnSuccess = true,
}: ServerFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = React.useRef<HTMLFormElement>(null);
  const lastEmitted = React.useRef<ActionResult | null>(null);

  React.useEffect(() => {
    if (pending) return;
    if (!state || state === lastEmitted.current) return;
    lastEmitted.current = state;

    if (state.success) {
      toast("Berhasil", successMessage ?? "Data tersimpan", "success");
      onSuccess?.(state.data);
      if (resetOnSuccess) ref.current?.reset();
    } else {
      toast("Gagal", state.error ?? "Terjadi kesalahan", "destructive");
      onError?.(state.error ?? "Terjadi kesalahan");
    }
  }, [state, pending, successMessage, onSuccess, onError, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={cn("space-y-4", className)}>
      {children}
    </form>
  );
}
