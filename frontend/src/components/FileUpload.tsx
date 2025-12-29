"use client";

import { useState, useCallback, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadFile, UploadResponse } from "@/lib/api";

interface FileUploadProps {
  onUploadComplete?: (result: UploadResponse) => void;
  onError?: (error: string) => void;
}

export function FileUpload({ onUploadComplete, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        const errorMsg = "Only CSV files are supported";
        setUploadStatus(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsUploading(true);
      setUploadStatus(null);

      try {
        const result = await uploadFile(file);
        setUploadStatus(result.status);
        onUploadComplete?.(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setUploadStatus(errorMsg);
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
    <Card className="p-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging
            ? "border-zinc-400 bg-zinc-50 dark:bg-zinc-800"
            : "border-zinc-200 dark:border-zinc-700"
          }
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <div className="text-3xl mb-2">📄</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
          {isUploading
            ? "Uploading..."
            : "Drag & drop a CSV file here, or click to select"}
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <Button asChild variant="outline" size="sm" disabled={isUploading}>
          <label htmlFor="file-upload" className="cursor-pointer">
            Select File
          </label>
        </Button>
        <p className="text-xs text-zinc-400 mt-2">
          Supports: Upwork, Nu Bank, BBVA transactions
        </p>
      </div>

      {uploadStatus && (
        <div
          className={`mt-3 p-2 rounded text-sm ${
            uploadStatus.toLowerCase().includes("error") ||
            uploadStatus.toLowerCase().includes("failed")
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          }`}
        >
          {uploadStatus}
        </div>
      )}
    </Card>
  );
}
