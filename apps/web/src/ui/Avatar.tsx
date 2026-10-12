import { type CSSProperties, useRef } from 'react';
import { haptic } from '../haptics';
import { BrandMark } from './Brand';

interface Props {
  name?: string;
  photo?: string;
  size?: number;
  /** Progress to the next tier, 0 to 1. Draws a ring when set. */
  progress?: number;
}

function initials(name?: string): string | undefined {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return undefined;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Round profile picture: your photo, your initials, or a spade. */
export function Avatar({ name, photo, size = 48, progress }: Props) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const inner = progress === undefined ? size : size - stroke * 2 - 4;
  const text = initials(name);
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {progress !== undefined && (
        <svg className="avatar-ring" width={size} height={size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-2)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--tint)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.max(0.02, Math.min(1, progress)))}
            style={{ '--circ': circ } as CSSProperties}
          />
        </svg>
      )}
      <span className="avatar-face" style={{ width: inner, height: inner, fontSize: inner * 0.38 }}>
        {photo ? (
          <img src={photo} alt="" />
        ) : text ? (
          text
        ) : (
          <BrandMark variant="glyph" size={Math.round(inner * 0.5)} />
        )}
      </span>
    </span>
  );
}

/** Reads an image file and returns a small square JPEG data URL, center cropped. */
export async function shrinkPhoto(file: File, px = 160): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not an image we can read.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, px, px);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Avatar you can tap to pick a new photo. */
export function AvatarPicker({ name, photo, onPhoto }: { name?: string; photo?: string; onPhoto: (photo: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className="avatar-picker">
      <button className="avatar-button" aria-label={photo ? 'Change photo' : 'Add a photo'} onClick={() => input.current?.click()} data-haptic="off">
        <Avatar name={name} photo={photo} size={76} />
        <span className="avatar-edit">{photo ? 'Edit' : 'Add'}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            onPhoto(await shrinkPhoto(file));
            haptic('success');
          } catch {
            haptic('error');
          }
        }}
      />
      {photo && (
        <button className="btn btn-plain" style={{ fontSize: '0.85rem' }} onClick={() => onPhoto(undefined)}>
          Remove photo
        </button>
      )}
    </span>
  );
}
