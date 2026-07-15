import { useRef, useState, type ChangeEvent } from "react";
import { Camera, CheckCircle, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
}

export function PhotoUpload({ onPhotoUploaded }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Envie apenas imagens (JPG, PNG, HEIC)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Imagem muito grande. Máximo 10MB.");
      return;
    }

    setError(null);

    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = (ev) => {
        const url = (ev.target?.result as string) ?? "";
        setPreview(url);
        resolve(url);
      };
    });
    reader.readAsDataURL(file);

    setUploading(true);
    setUploaded(false);
    try {
      const timestamp = Date.now();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `churrasqueira_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("churrasqueira-fotos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("churrasqueira-fotos").getPublicUrl(fileName);

      setUploaded(true);
      setUploading(false);
      onPhotoUploaded(urlData.publicUrl);
    } catch (err) {
      // Fallback: usa o data URL local para o fluxo continuar (vendedor recebe via WhatsApp).
      console.warn("Upload para storage falhou, usando fallback local:", err);
      const dataUrl = await dataUrlPromise;
      setUploaded(true);
      setUploading(false);
      onPhotoUploaded(dataUrl);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setUploaded(false);
    setError(null);
    onPhotoUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Foto da churrasqueira</label>

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background/50 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-card-hover"
        >
          <Camera className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium text-foreground">Toque para tirar foto ou escolher da galeria</span>
          <span className="text-xs text-secondary-foreground">Ajuda o vendedor a entender seu projeto</span>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
          <img src={preview} alt="Prévia da foto enviada" className="w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/70 px-3 py-2 text-xs font-medium text-white">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : uploaded ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-400" /> Foto enviada
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remover foto"
            className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition-colors hover:bg-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
