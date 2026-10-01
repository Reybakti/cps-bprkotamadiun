"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  /** Label yang tampil selagi request sedang berjalan. */
  pendingLabel?: React.ReactNode;
}

/**
 * Tombol submit yang otomatis disabled + ganti label saat form pending.
 * Memakai `useFormStatus`, jadi harus berada di dalam <form>.
 */
export function SubmitButton({ pendingLabel, children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingLabel ?? "Menyimpan...") : children}
    </Button>
  );
}
