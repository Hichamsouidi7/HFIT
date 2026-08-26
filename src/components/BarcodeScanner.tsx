"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Camera barcode scanner.
 *
 * Uses the ponyfill from `barcode-detector`, which calls the browser's native
 * BarcodeDetector when it exists (Chrome on Android) and drops to a ZXing
 * WebAssembly build otherwise. Safari has no native implementation, and the
 * phone this runs on is an iPhone, so the WASM path is the normal one here —
 * it is bundled with the app rather than pulled from a CDN.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // Loaded lazily: the WASM decoder is ~2 MB and must not sit in the
        // bundle of every page that merely links to the scanner.
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        // iOS refuses to play inline video without both of these.
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();
        setReady(true);

        const detector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });

        const tick = async () => {
          if (cancelled || doneRef.current || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            const value = found[0]?.rawValue?.replace(/\D/g, "");
            if (value && value.length >= 6) {
              doneRef.current = true;
              // Small haptic confirmation where the browser allows it.
              navigator.vibrate?.(60);
              stop();
              onDetected(value);
              return;
            }
          } catch {
            /* a frame that fails to decode is the normal case, not an error */
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        const name = (e as Error)?.name;
        setError(
          name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorise-le dans les réglages de Safari, puis réessaie."
            : "Impossible d'ouvrir la caméra sur cet appareil.",
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onDetected, stop]);

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Aiming frame: a barcode read is much faster when it is centred. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-40 w-72 rounded-3xl border-2 border-white/85 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]">
          <span className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 rounded bg-accent/90" />
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-[13px] font-medium text-white/85">
          {error ? "Scan indisponible" : ready ? "Vise le code-barres" : "Ouverture de la caméra…"}
        </p>
        <button
          onClick={() => {
            stop();
            onClose();
          }}
          className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-lg"
        >
          Fermer
        </button>
      </div>

      {error && (
        <div className="absolute inset-x-5 bottom-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="rounded-2xl bg-white/95 p-4 text-center text-[13px] leading-relaxed text-ink">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
