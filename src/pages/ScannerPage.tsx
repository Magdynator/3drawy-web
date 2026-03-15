import { useEffect, useRef, useState, FormEvent, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, CheckCircle2, Scan } from "lucide-react";
import ScannerOverlay from "@/components/ScannerOverlay";
import { useAttendanceScanner } from "@/hooks/useAttendanceScanner";

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    recordAttendance,
    lastScanned,
    scanSuccess,
    processingRef,
  } = useAttendanceScanner();

  const startScanning = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const scanner = new Html5Qrcode("scanner-container", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: { exact: "environment" } },
        {
          fps: 20,
          qrbox: (vw: number, vh: number) => {
            const w = Math.round(vw * 0.8);
            const h = Math.round(vh * 0.5);
            return { width: Math.max(w, 200), height: Math.max(h, 120) };
          },
          aspectRatio: window.innerWidth < 768 ? 1.0 : 1.5,
          disableFlip: true,
        },
        (decodedText) => {
          if (processingRef.current) return;
          recordAttendance.mutate(decodedText);
          scanner.pause(true);
          setTimeout(() => {
            try {
              scanner.resume();
            } catch {}
          }, 3000);
        },
        () => {}
      );

      // Apply advanced constraints for autofocus
      try {
        const videoElem = containerRef.current?.querySelector("video");
        if (videoElem?.srcObject) {
          const track = (videoElem.srcObject as MediaStream).getVideoTracks()[0];
          const caps = track.getCapabilities?.() as any;
          const constraints: any = {};
          if (caps?.focusMode?.includes("continuous")) {
            constraints.focusMode = "continuous";
          }
          if (caps?.zoom) {
            constraints.zoom = Math.min(caps.zoom.max, 2);
          }
          if (Object.keys(constraints).length > 0) {
            await track.applyConstraints({ advanced: [constraints] });
          }
        }
      } catch {}

      setScanning(true);
    } catch {
      // Fallback without exact facingMode
      try {
        const scanner = new Html5Qrcode("scanner-container", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: (vw: number, vh: number) => {
              const w = Math.round(vw * 0.8);
              const h = Math.round(vh * 0.5);
              return { width: Math.max(w, 200), height: Math.max(h, 120) };
            },
            disableFlip: true,
          },
          (decodedText) => {
            if (processingRef.current) return;
            recordAttendance.mutate(decodedText);
            scanner.pause(true);
            setTimeout(() => {
              try { scanner.resume(); } catch {}
            }, 3000);
          },
          () => {}
        );
        setScanning(true);
      } catch {
        // give up
      }
    }
  }, [processingRef, recordAttendance]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <DashboardLayout title="Barcode Scanner">
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="glass-card overflow-hidden">
          {/* Camera viewport */}
          <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
            <div
              id="scanner-container"
              ref={containerRef}
              className="absolute inset-0 bg-black [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
              style={{ minHeight: "280px" }}
            />
            <ScannerOverlay
              scanning={scanning}
              scanSuccess={scanSuccess}
              lastScanned={lastScanned}
            />

            {/* Placeholder when not scanning */}
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-3">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <Scan className="h-8 w-8 text-primary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Tap below to start scanning
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 space-y-3">
            <Button
              onClick={scanning ? stopScanning : startScanning}
              className={`w-full rounded-xl h-12 font-semibold transition-all duration-300 ${
                scanning
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                  : "gradient-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:scale-[1.02]"
              }`}
              variant={scanning ? "outline" : "default"}
            >
              {scanning ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </>
              )}
            </Button>

            {lastScanned && !scanning && (
              <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 justify-center animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-semibold text-foreground">
                  Recorded: {lastScanned}
                </span>
              </div>
            )}

            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Or enter barcode manually:
              </p>
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  const val = manualBarcode.trim();
                  if (!val) return;
                  recordAttendance.mutate(val);
                  setManualBarcode("");
                }}
                className="flex gap-2"
              >
                <Input
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Type or paste barcode…"
                  className="flex-1 rounded-xl bg-muted/30 border-border/50"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!manualBarcode.trim()}
                  className="rounded-xl"
                >
                  Submit
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
