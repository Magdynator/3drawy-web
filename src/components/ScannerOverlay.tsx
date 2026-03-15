import { CheckCircle2 } from "lucide-react";

interface ScannerOverlayProps {
  scanning: boolean;
  scanSuccess: boolean;
  lastScanned: string | null;
}

export default function ScannerOverlay({ scanning, scanSuccess, lastScanned }: ScannerOverlayProps) {
  if (!scanning) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Dark overlay with cutout */}
      <div className="absolute inset-0">
        {/* Top */}
        <div className="absolute top-0 left-0 right-0 h-[25%] bg-black/50" />
        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-black/50" />
        {/* Left */}
        <div className="absolute top-[25%] left-0 w-[10%] h-[50%] bg-black/50" />
        {/* Right */}
        <div className="absolute top-[25%] right-0 w-[10%] h-[50%] bg-black/50" />
      </div>

      {/* Scan frame */}
      <div className="absolute top-[25%] left-[10%] right-[10%] h-[50%] rounded-2xl">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-xl" />

        {/* Animated scan line */}
        {!scanSuccess && (
          <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
        )}

        {/* Success flash */}
        {scanSuccess && (
          <div className="absolute inset-0 rounded-2xl bg-success/20 flex items-center justify-center animate-fade-in">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-success animate-scale-in" />
              <span className="text-success font-bold text-sm">{lastScanned}</span>
            </div>
          </div>
        )}
      </div>

      {/* Instruction text */}
      {!scanSuccess && (
        <div className="absolute bottom-[18%] left-0 right-0 text-center">
          <p className="text-primary-foreground/80 text-xs font-medium bg-black/40 inline-block px-4 py-1.5 rounded-full">
            Align barcode within the frame
          </p>
        </div>
      )}
    </div>
  );
}
