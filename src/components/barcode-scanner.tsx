"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, ScanLine } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Camera barcode scanner.
 *
 * Retail products carry EAN-13, a 1D barcode that is much harder to read with a
 * phone camera than a QR code. Two readers are used: the browser's built-in
 * BarcodeDetector where it exists (Chrome on Android - fast and accurate), and
 * ZXing everywhere else (iOS Safari, desktop Chrome). A manual entry box is
 * always available, because a camera that will not focus should never be the
 * only way to record a movement.
 *
 * getUserMedia needs a secure context: it works on localhost, but over a LAN IP
 * such as 192.168.1.5:3000 the browser blocks the camera outright. Testing on a
 * real phone means deploying over HTTPS or using a tunnel.
 */

const EAN_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
] as const;

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (options?: { formats?: readonly string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function nativeDetector(): BarcodeDetectorCtor | null {
  const w = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

export function BarcodeScanner({
  onDetected,
  triggerLabel = "สแกนบาร์โค้ด",
  autoFocusManual = false,
}: {
  onDetected: (barcode: string) => void;
  triggerLabel?: string;
  autoFocusManual?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const emit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      onDetected(trimmed);
      setManual("");
      setOpen(false);
    },
    [onDetected],
  );

  const stopCamera = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const Native = nativeDetector();

      if (Native) {
        const detector = new Native({ formats: EAN_FORMATS });
        let active = true;
        const tick = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              active = false;
              stopCamera();
              emit(codes[0].rawValue);
              return;
            }
          } catch {
            // A single failed frame is normal; keep going.
          }
          requestAnimationFrame(tick);
        };
        stopRef.current = () => {
          active = false;
        };
        requestAnimationFrame(tick);
        return;
      }

      // Fallback: ZXing, loaded only when the native detector is missing.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) {
          controls.stop();
          stopCamera();
          emit(result.getText());
        }
      });
      stopRef.current = () => controls.stop();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setScanning(false);
      if (name === "NotAllowedError") {
        setError("เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง กดอนุญาตที่แถบที่อยู่แล้วลองใหม่");
      } else if (name === "NotFoundError") {
        setError("ไม่พบกล้องบนอุปกรณ์นี้ ใช้ช่องพิมพ์บาร์โค้ดด้านล่างแทนได้");
      } else if (!window.isSecureContext) {
        setError(
          "กล้องใช้ได้เฉพาะบน HTTPS หรือ localhost เท่านั้น ถ้าเปิดผ่าน IP ในวง LAN ให้ใช้ช่องพิมพ์บาร์โค้ดแทน",
        );
      } else {
        setError("เปิดกล้องไม่สำเร็จ ใช้ช่องพิมพ์บาร์โค้ดด้านล่างแทนได้");
      }
    }
  }, [emit, stopCamera]);

  // Release the camera when the component goes away. Closing the dialog is
  // handled in onOpenChange so no state is written from inside the effect.
  useEffect(() => stopCamera, [stopCamera]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) stopCamera();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <ScanLine className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สแกนบาร์โค้ดสินค้า</DialogTitle>
          <DialogDescription>
            เล็งกล้องให้เส้นบาร์โค้ดเต็มกรอบ หรือพิมพ์เลขบาร์โค้ดเองก็ได้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <video
              ref={videoRef}
              playsInline
              muted
              className="size-full object-cover"
            />
            {!scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <CameraOff className="size-8 text-muted-foreground" />
                <Button type="button" size="sm" onClick={startCamera}>
                  <Camera className="size-4" />
                  เปิดกล้อง
                </Button>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              emit(manual);
            }}
            className="space-y-2"
          >
            <label
              htmlFor="manual-barcode"
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Keyboard className="size-3.5" />
              พิมพ์บาร์โค้ดเอง
            </label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="เช่น 8850001110019"
                inputMode="numeric"
                autoFocus={autoFocusManual}
              />
              <Button type="submit" disabled={!manual.trim()}>
                ใช้เลขนี้
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
