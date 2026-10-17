"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

const CATEGORIES: [string, string][] = [
  ["bug", "Something is broken"],
  ["ask", "Ask gave a wrong or bad answer"],
  ["account", "Sign-in or account"],
  ["content", "Wrong or missing information"],
  ["security", "Security or privacy"],
  ["other", "Something else"],
];
const MAX_IMAGES = 3;
const MAX_SIDE = 1600;
const TARGET_BYTES = 900_000;

interface Picked {
  file: File;
  url: string;
}

/** Shrinks a photo/screenshot in the browser so uploads stay small (max 1600px, JPEG). */
async function shrink(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES && /^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && (blob.size <= TARGET_BYTES || q === 0.55))
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  return file;
}

export function ReportForm({ defaultPage }: { defaultPage: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState(defaultPage);
  const [images, setImages] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images]);

  const addFiles = async (list: FileList | null) => {
    setError(null);
    if (!list) return;
    const room = MAX_IMAGES - images.length;
    const files = [...list].filter((f) => f.type.startsWith("image/"));
    if (files.length > room) setError(`You can attach up to ${MAX_IMAGES} images.`);
    const picked: Picked[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const small = await shrink(f);
        picked.push({ file: small, url: URL.createObjectURL(small) });
      } catch {
        setError("One image could not be read. Use PNG, JPEG or WebP.");
      }
    }
    setImages((cur) => [...cur, ...picked]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (i: number) =>
    setImages((cur) => {
      URL.revokeObjectURL(cur[i]!.url);
      return cur.filter((_, j) => j !== i);
    });

  const validate = () => {
    if (!category) return "Choose what the problem is about.";
    if (subject.trim().length < 3) return "Add a short subject (at least 3 characters).";
    if (description.trim().length < 10) return "Describe the problem (at least 10 characters).";
    return null;
  };

  const send = async () => {
    setSending(true);
    setError(null);
    const form = new FormData();
    form.set("category", category);
    form.set("subject", subject);
    form.set("description", description);
    form.set("pageUrl", pageUrl);
    for (const im of images) form.append("images", im.file, im.file.name);
    try {
      const res = await fetch("/api/v1/support/tickets", { method: "POST", body: form });
      if (!res.ok) {
        const p = await res.json().catch(() => null);
        throw new Error(p?.detail ?? "The report could not be sent. Please try again.");
      }
      router.push("/support/complaints?sent=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report could not be sent.");
      setSending(false);
      setConfirming(false);
    }
  };

  const label = CATEGORIES.find((c) => c[0] === category)?.[1] ?? "";

  return (
    <form
      className="card support-form"
      data-testid="support-form"
      onSubmit={(e) => {
        e.preventDefault();
        const v = validate();
        if (v) setError(v);
        else setConfirming(true);
      }}
    >
      <div className="field">
        <label htmlFor="sp-category">What is it about?</label>
        <select
          id="sp-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Choose one…</option>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sp-subject">Subject</label>
        <input
          id="sp-subject"
          type="text"
          value={subject}
          maxLength={140}
          placeholder="e.g. Google sign-in shows an error"
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="sp-description">What happened?</label>
        <textarea
          id="sp-description"
          rows={6}
          value={description}
          maxLength={5000}
          placeholder="What did you do, what did you expect, and what happened instead?"
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <span className="hint">
          {description.length}/5000 · Please don&apos;t include passwords or other private details.
        </span>
      </div>

      <div className="field">
        <label htmlFor="sp-page">Page where it happened (optional)</label>
        <input
          id="sp-page"
          type="url"
          value={pageUrl}
          maxLength={500}
          onChange={(e) => setPageUrl(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="support-label">
          Screenshots or photos as proof (optional, up to {MAX_IMAGES})
        </span>
        <div className="support-images">
          {images.map((im, i) => (
            <figure key={im.url} className="support-thumb">
              <img src={im.url} alt={`Attachment ${i + 1}`} />
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                onClick={() => removeImage(i)}
              >
                ×
              </button>
            </figure>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="support-add" htmlFor="sp-images">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Add image</span>
            </label>
          )}
          <input
            ref={fileRef}
            id="sp-images"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="skip"
            onChange={(e) => void addFiles(e.target.files)}
            data-testid="support-images"
          />
        </div>
        <span className="hint">PNG, JPEG or WebP. Large images are resized before upload.</span>
      </div>

      {error && (
        <p className="notice err" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      <div>
        <button type="submit" className="btn primary" data-testid="support-send">
          Send report
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Send this report?"
          confirmLabel="Send report"
          busy={sending}
          onConfirm={() => void send()}
          onCancel={() => setConfirming(false)}
          testId="support-confirm"
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>{subject.trim()}</strong>
          </p>
          <p style={{ margin: 0 }}>
            {label}
            {images.length
              ? ` · ${images.length} image${images.length === 1 ? "" : "s"} attached`
              : ""}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            You can follow it, or withdraw it, under My complaints.
          </p>
        </ConfirmDialog>
      )}
    </form>
  );
}
