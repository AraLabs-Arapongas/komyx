"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { compressImage } from "@/lib/image-compress";

const FILE_CLASS = "block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-brand file:font-medium";

/**
 * File input for photos. Each chosen image is resized in the browser (see compressImage) and put
 * back into the input, so the form submits the small version. `onFile` gets the compressed file
 * (first one) for previews.
 */
export function ImageInput({ onFile, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept" | "onChange"> & { onFile?: (file: File) => void }) {
  const [busy, setBusy] = useState(false);
  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    setBusy(true);
    try {
      const small = await Promise.all(files.map((f) => compressImage(f)));
      const dt = new DataTransfer();
      small.forEach((f) => dt.items.add(f));
      input.files = dt.files;
      if (small[0]) onFile?.(small[0]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="block space-y-1">
      <input {...props} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} className={className ?? FILE_CLASS} />
      {busy ? <span className="block text-xs text-muted">Reduzindo a imagem…</span> : null}
    </span>
  );
}
