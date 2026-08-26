"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Chips, EmptyState, Sheet, Toast } from "@/components/ui";
import { compressImage } from "@/lib/image";
import { formatDayFR } from "@/lib/day";

export interface Photo {
  id: number;
  day: string;
  pose: string;
  weightKg: number | null;
  note: string | null;
}

const POSES = [
  { id: "face", label: "Face" },
  { id: "profil", label: "Profil" },
  { id: "dos", label: "Dos" },
] as const;

type Pose = (typeof POSES)[number]["id"];

/**
 * The photo diary.
 *
 * Photos are the only honest record of recomposition: the scale conflates fat,
 * water and muscle, and a mirror has no memory. The comparison view is the
 * point of the whole feature — first photo against latest, same pose, side by
 * side, with the weight of each.
 */
export function ProgressPhotos({ initial }: { initial: Photo[] }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [photos, setPhotos] = useState(initial);
  const [pose, setPose] = useState<Pose>("face");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ofPose = useMemo(
    () => photos.filter((p) => p.pose === pose).sort((a, b) => a.day.localeCompare(b.day)),
    [photos, pose],
  );

  const first = ofPose[0] ?? null;
  const latest = ofPose.length > 1 ? ofPose[ofPose.length - 1] : null;

  function say(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      // Kept a little larger and sharper than a meal photo: this one is looked
      // at closely, and side by side with another.
      const compressed = await compressImage(file, { maxSize: 1080, quality: 0.78 });

      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed.dataUrl, pose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Envoi impossible.");
        return;
      }
      setPhotos((prev) => [data.photo, ...prev]);
      say("Photo enregistrée");
    } catch {
      setError("Impossible de traiter cette photo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setOpen(null);
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    say("Photo supprimée");
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      <Chips options={POSES as unknown as { id: Pose; label: string }[]} value={pose} onChange={setPose} />

      <div className="mt-4">
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Enregistrement…" : `Prendre la photo de ${poseLabel(pose)}`}
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-danger/10 p-3.5 text-center text-[12.5px] text-danger">
          {error}
        </p>
      )}

      {first && latest && (
        <section className="card mt-6 p-4">
          <h3 className="text-[13px] font-bold">Avant / maintenant</h3>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Compare photo={first} label="Départ" />
            <Compare photo={latest} label="Aujourd'hui" />
          </div>
          {first.weightKg != null && latest.weightKg != null && (
            <p className="mt-3 text-center text-[12.5px] font-semibold text-accent">
              {(first.weightKg - latest.weightKg).toFixed(1)} kg d&apos;écart entre les deux
            </p>
          )}
        </section>
      )}

      <h3 className="label mt-7">
        {ofPose.length > 0 ? `${ofPose.length} photo${ofPose.length > 1 ? "s" : ""}` : "Aucune photo"}
      </h3>

      {ofPose.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={`Pas encore de photo de ${poseLabel(pose)}`}
            body="Même lumière, même endroit, même heure : c'est ce qui rend la comparaison lisible dans trois semaines."
          />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[...ofPose].reverse().map((photo) => (
            <button
              key={photo.id}
              onClick={() => setOpen(photo)}
              className="overflow-hidden rounded-2xl transition active:scale-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${photo.id}/image`}
                alt={`${poseLabel(photo.pose as Pose)} du ${photo.day}`}
                loading="lazy"
                className="aspect-[3/4] w-full bg-sunken object-cover"
              />
              <span className="tnum mt-1 block text-center text-[10px] text-muted">
                {photo.weightKg != null ? `${photo.weightKg.toFixed(1)} kg` : photo.day.slice(5)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? formatDayFR(open.day) : ""}
      >
        {open && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${open.id}/image`}
              alt=""
              className="w-full rounded-2xl bg-sunken object-contain"
            />
            <p className="mt-3 text-center text-[13px] text-muted">
              {poseLabel(open.pose as Pose)}
              {open.weightKg != null && ` · ${open.weightKg.toFixed(1)} kg`}
            </p>
            <div className="mt-4 pb-2">
              <Button variant="ghost" onClick={() => remove(open.id)}>
                Supprimer cette photo
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Toast message={toast} />
    </>
  );
}

function Compare({ photo, label }: { photo: Photo; label: string }) {
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/photos/${photo.id}/image`}
        alt={label}
        loading="lazy"
        className="aspect-[3/4] w-full rounded-2xl bg-sunken object-cover"
      />
      <p className="mt-1.5 text-center text-[11px] font-semibold">{label}</p>
      <p className="tnum text-center text-[11px] text-muted">
        {photo.weightKg != null ? `${photo.weightKg.toFixed(1)} kg` : photo.day}
      </p>
    </div>
  );
}

function poseLabel(pose: Pose | string): string {
  return POSES.find((p) => p.id === pose)?.label.toLowerCase() ?? "face";
}
