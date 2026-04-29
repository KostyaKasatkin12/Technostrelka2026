import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CropModal } from "@/components/crop-modal";

export function ImageUpload({
  value,
  onChange,
  label = "Загрузить изображение",
  hint = "JPG, PNG или WEBP, до 5 МБ",
  height = 180,
  aspect = 1,
  enableCrop = false,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  height?: number;
  aspect?: number;
  enableCrop?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "image.jpg");
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Не удалось загрузить");
      onChange(data.url);
      toast.success("Файл загружен");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл больше 5 МБ. Сожмите изображение и попробуйте снова.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Поддерживаются только JPG, PNG и WEBP.");
      return;
    }
    if (enableCrop) {
      const url = URL.createObjectURL(file);
      setCropSrc(url);
      setCropOpen(true);
      return;
    }
    await uploadBlob(file);
  }

  const handleCrop = async (blob: Blob) => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    await uploadBlob(blob);
  };

  return (
    <div className="space-y-2">
      {cropSrc && (
        <CropModal
          src={cropSrc}
          aspect={aspect}
          open={cropOpen}
          onClose={() => { setCropOpen(false); if (cropSrc) URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onCrop={handleCrop}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <div
        style={{ height }}
        className="border-2 border-dashed border-border bg-card/50 flex items-center justify-center overflow-hidden relative"
      >
        {value ? (
          <>
            <img
              src={value}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 bg-background/90 border-2 border-border p-1 hover:border-destructive hover:text-destructive transition-colors"
              aria-label="Удалить"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-muted-foreground font-mono text-xs px-4">
            {hint}
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-none w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        {value ? "Заменить" : label}
      </Button>
    </div>
  );
}
