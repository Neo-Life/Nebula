type Rgb = { r: number; g: number; b: number };

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(color: string): string | null {
  const trimmed = color.trim();
  const match = HEX_RE.exec(trimmed);
  if (!match) return null;

  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex}`;
}

function hexToRgb(color: string): Rgb | null {
  const hex = normalizeHex(color);
  if (!hex) return null;

  const value = hex.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((c) => Number.isNaN(c))) return null;
  return { r, g, b };
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const tt = Math.min(1, Math.max(0, t));
  return {
    r: a.r + (b.r - a.r) * tt,
    g: a.g + (b.g - a.g) * tt,
    b: a.b + (b.b - a.b) * tt,
  };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: Rgb): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ensureMinContrast(
  color: string,
  background: string,
  minRatio: number,
  prefer: 'lighter' | 'darker',
): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!fg || !bg) return color;

  if (contrastRatio(fg, bg) >= minRatio) return rgbToHex(fg);

  const target =
    prefer === 'lighter'
      ? ({ r: 255, g: 255, b: 255 } as Rgb)
      : ({ r: 0, g: 0, b: 0 } as Rgb);

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = mixRgb(fg, target, mid);
    if (contrastRatio(candidate, bg) >= minRatio) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return rgbToHex(mixRgb(fg, target, hi));
}

export type DerivedAccentColors = {
  lightPrimary: string;
  lightTextPrimary: string;
  darkPrimary: string;
};

export function deriveAccentColors(
  baseColor: string,
  lightBackground: string,
  darkBackground: string,
): DerivedAccentColors {
  // Targets chosen to keep accents visible as borders/icons (≈3:1)
  // and readable when used as text (≈4.5:1).
  const lightPrimary = ensureMinContrast(
    baseColor,
    lightBackground,
    3,
    'darker',
  );
  const lightTextPrimary = ensureMinContrast(
    lightPrimary,
    lightBackground,
    4.5,
    'darker',
  );

  const darkPrimary = ensureMinContrast(
    baseColor,
    darkBackground,
    4.5,
    'lighter',
  );

  return { lightPrimary, lightTextPrimary, darkPrimary };
}
