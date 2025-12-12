import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  userInitials: string;
  onAvatarUpdate: (url: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userInitials,
  onAvatarUpdate,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
        setIsOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const handleUpload = async () => {
    if (!imgRef.current || !completedCrop) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const fileName = `${userId}/avatar-${Date.now()}.jpg`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate(urlData.publicUrl);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });

      handleClose();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <div className="relative group">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
          <AvatarImage src={currentAvatarUrl || undefined} alt="Profile" />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onSelectFile}
          className="hidden"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="flex justify-center">
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[400px] object-contain"
                />
              </ReactCrop>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !completedCrop}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
