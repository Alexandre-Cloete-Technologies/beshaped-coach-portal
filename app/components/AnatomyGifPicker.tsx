"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Upload, ImageIcon } from "lucide-react";
import { listFilesWithUrls, uploadFile } from "@/lib/firebase";

const ANATOMY_STORAGE_PATH = "videos/exercises/anatomy";

function isMp4Url(nameOrUrl: string) {
  return /\.mp4($|\?|#)/i.test(nameOrUrl);
}

interface AnatomyGifPickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function AnatomyGifPicker({
  value,
  onChange,
  label = "Anatomy Walkthrough",
}: AnatomyGifPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gifs, setGifs] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadGifs();
    }
  }, [isOpen]);

  const loadGifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listFilesWithUrls(ANATOMY_STORAGE_PATH);
      setGifs(items.filter((item) => /\.(gif|mp4)$/i.test(item.name)));
    } catch (err) {
      console.error("Error loading anatomy GIFs:", err);
      setError("Failed to load GIFs");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (url: string) => {
    onChange(url);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGif = file.type === "image/gif";
    const isMp4 = file.type === "video/mp4";
    if (!isGif && !isMp4) {
      alert("Please select a GIF or MP4 file.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const path = `${ANATOMY_STORAGE_PATH}/${file.name}`;
      const url = await uploadFile(file, path);
      onChange(url);
      setGifs((prev) => [...prev, { name: file.name, url }]);
      setIsOpen(false);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-card-foreground mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[88px] px-3 py-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-center gap-3 text-left"
      >
        {value ? (
          <>
            {isMp4Url(value) ? (
              <video
                src={value}
                className="w-16 h-16 object-cover rounded border border-border flex-shrink-0"
                muted
                playsInline
                aria-label="Selected anatomy"
              />
            ) : (
              <Image
                src={value}
                alt="Selected anatomy"
                width={64}
                height={64}
                unoptimized
                className="w-16 h-16 object-cover rounded border border-border flex-shrink-0"
              />
            )}
            <span className="text-sm text-muted-foreground flex-1 truncate">
              Click to change
            </span>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              Click to choose anatomy GIF
            </span>
          </>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-card-foreground">
                Choose Anatomy GIF
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <p className="text-sm text-red-500 mb-4">{error}</p>
              )}

              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading GIFs...
                </p>
              ) : gifs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No GIFs yet. Upload one below.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                  {gifs.map(({ name, url }) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handleSelect(url)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:ring-2 hover:ring-primary ${
                        value === url
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {isMp4Url(name) || isMp4Url(url) ? (
                        <video
                          src={url}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                          aria-label={name}
                        />
                      ) : (
                        <Image
                          src={url}
                          alt={name}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 28vw, 200px"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gif,.mp4,image/gif,video/mp4"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload GIF or MP4"}
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
