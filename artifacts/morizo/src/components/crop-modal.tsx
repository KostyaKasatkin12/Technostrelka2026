import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";

type Pos = { x: number; y: number };

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function CropModal({
  src,
  aspect = 1,
  open,
  onClose,
  onCrop,
}: {
  src: string;
  aspect?: number;
  open: boolean;
  onClose: () => void;
  onCrop: (blob: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef<Pos>({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });

  const CANVAS_W = 320;
  const CANVAS_H = Math.round(CANVAS_W / aspect);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setLoaded(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const fitScale = Math.max(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
      setLoaded(true);
    };
    img.src = src;
  }, [src, open, CANVAS_W, CANVAS_H]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loaded) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const dw = naturalSize.w * scale;
    const dh = naturalSize.h * scale;
    const dx = (CANVAS_W - dw) / 2 + offset.x;
    const dy = (CANVAS_H - dh) / 2 + offset.y;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_W - 2, CANVAS_H - 2);
    if (aspect === 1) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 3, 0);
      ctx.lineTo(CANVAS_W / 3, CANVAS_H);
      ctx.moveTo((CANVAS_W / 3) * 2, 0);
      ctx.lineTo((CANVAS_W / 3) * 2, CANVAS_H);
      ctx.moveTo(0, CANVAS_H / 3);
      ctx.lineTo(CANVAS_W, CANVAS_H / 3);
      ctx.moveTo(0, (CANVAS_H / 3) * 2);
      ctx.lineTo(CANVAS_W, (CANVAS_H / 3) * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [loaded, scale, offset, naturalSize, CANVAS_W, CANVAS_H, aspect]);

  useEffect(() => { draw(); }, [draw]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const dw = naturalSize.w * scale;
    const dh = naturalSize.h * scale;
    const maxOX = Math.max(0, (dw - CANVAS_W) / 2 + 10);
    const maxOY = Math.max(0, (dh - CANVAS_H) / 2 + 10);
    setOffset(prev => ({
      x: clamp(prev.x + dx, -maxOX, maxOX),
      y: clamp(prev.y + dy, -maxOY, maxOY),
    }));
  };
  const onPointerUp = () => setDragging(false);

  const zoom = (delta: number) => {
    const fitScale = Math.max(CANVAS_W / naturalSize.w, CANVAS_H / naturalSize.h);
    setScale(prev => clamp(prev + delta, fitScale * 0.9, fitScale * 4));
  };

  const reset = () => {
    const fitScale = Math.max(CANVAS_W / naturalSize.w, CANVAS_H / naturalSize.h);
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement("canvas");
    const outSize = aspect === 1 ? 512 : Math.round(512 / aspect) * aspect > 512 ? 512 : 512;
    out.width = outSize;
    out.height = Math.round(outSize / aspect);
    const ctx = out.getContext("2d")!;
    const sx = CANVAS_W / out.width;
    const sy = CANVAS_H / out.height;
    ctx.scale(1 / sx, 1 / sy);
    ctx.drawImage(canvas, 0, 0);
    out.toBlob(blob => { if (blob) onCrop(blob); }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="rounded-none border-2 max-w-sm p-6" open={open}>
        <DialogHeader>
          <DialogTitle className="font-black uppercase">Кадрирование</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs font-mono text-muted-foreground">
            Тащи · Масштабируй · Кадрируй
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className={`border-2 border-border ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ width: CANVAS_W, height: CANVAS_H, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => zoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => zoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-none" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="sm" className="rounded-none font-bold uppercase px-5" onClick={handleCrop}>
              <Check className="h-4 w-4 mr-1" /> Готово
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
