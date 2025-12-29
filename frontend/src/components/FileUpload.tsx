"use client";

import { useState, useCallback, DragEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { uploadFile, UploadResponse } from "@/lib/api";

interface FileUploadProps {
  onUploadComplete?: (result: UploadResponse) => void;
  onError?: (error: string) => void;
}

export function FileUpload({ onUploadComplete, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        const errorMsg = "Only CSV files are supported";
        setUploadStatus({ type: "error", message: errorMsg });
        onError?.(errorMsg);
        return;
      }

      setIsUploading(true);
      setUploadStatus(null);

      try {
        const result = await uploadFile(file);
        setUploadStatus({ type: "success", message: result.status });
        onUploadComplete?.(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setUploadStatus({ type: "error", message: errorMsg });
        onError?.(errorMsg);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onError]
  );

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-5 text-center",
          "transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-brand-500 bg-brand-500/10 scale-[1.02]"
            : "border-border/50 hover:border-brand-500/30 hover:bg-secondary/30",
          isUploading && "opacity-60 pointer-events-none"
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
            "transition-all duration-200",
            isDragging
              ? "gradient-brand text-white scale-110 glow-sm"
              : "bg-secondary/50 text-muted-foreground"
          )}
        >
          {isUploading ? (
            <svg
              className="w-6 h-6 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <p className="text-sm text-foreground font-medium mb-1">
          {isUploading
            ? "Uploading..."
            : isDragging
            ? "Drop to upload"
            : "Drop your CSV here"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          or click to browse
        </p>

        {/* Hidden Input */}
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="file-upload"
        />

        {/* Supported Formats */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {["Upwork", "Nu Bank", "BBVA"].map((format) => (
            <span
              key={format}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full
                       bg-secondary/50 text-muted-foreground"
            >
              {format}
            </span>
          ))}
        </div>
      </div>

      {/* Status Message */}
      {uploadStatus && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-lg animate-slide-up",
            "text-sm",
            uploadStatus.type === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-brand-500/10 text-brand-400 border border-brand-500/20"
          )}
        >
          {uploadStatus.type === "error" ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-xs">{uploadStatus.message}</span>
          <button
            onClick={() => setUploadStatus(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
