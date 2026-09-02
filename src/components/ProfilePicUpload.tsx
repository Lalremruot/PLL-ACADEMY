'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ProfilePicUploadProps {
  value: string;
  onChange: (dataUrl: string) => void;
  compact?: boolean;
}

const MAX_BYTES = 1024 * 1024; // 1 MB

/** Reads an image file as a base64 data URL so it can be stored on the subscription. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Image upload+preview control for a student's profile picture. Reads the chosen
 * file as a base64 data URL (stored directly on the subscription) instead of
 * hot-linking an external image URL.
 */
export default function ProfilePicUpload({ value, onChange, compact = false }: ProfilePicUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WEBP, etc.).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is too large. Please choose one under 1 MB.`);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setError('');
      onChange(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Could not read the image.');
    }
  };

  return (
    <div>
      <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
        Profile Picture
      </label>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="Student preview"
            className={`shrink-0 rounded-xs object-cover object-top border border-brand-border bg-brand-charcoal ${
              compact ? 'h-12 w-9' : 'h-16 w-12'
            }`}
          />
        ) : (
          <div
            className={`shrink-0 rounded-xs border border-dashed border-brand-border bg-brand-charcoal flex items-center justify-center text-gray-600 ${
              compact ? 'h-12 w-9' : 'h-16 w-12'
            }`}
          >
            <ImagePlus className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-brand-charcoal hover:bg-brand-surface-hover border border-brand-border text-white rounded-xs text-[10px] font-bold uppercase cursor-pointer"
            >
              {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex items-center gap-1 px-2 py-1.5 bg-transparent hover:bg-brand-surface-hover text-gray-400 hover:text-white rounded-xs text-[10px] font-bold uppercase cursor-pointer"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
          <p className="font-sans text-[9px] text-gray-500">Image up to 1 MB · stored on the student record</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="text-brand-cinnabar text-[10px] mt-1 font-mono">{error}</p>}
    </div>
  );
}