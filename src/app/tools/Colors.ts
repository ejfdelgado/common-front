/**
 * Generate n linearly interpolated hex colors between hex1 and hex2 (inclusive).
 * 
 * @param {string} hex1 - Start color (e.g. "#f00", "ff0000", "#00ff88")
 * @param {string} hex2 - End color
 * @param {number} n     - Number of colors to return (>=1). If n <= 0 returns [].
 * @returns {string[]}   - Array of n hex colors like ["#ff0000", ... , "#00ff00"]
 */
export function lerpHexColors(hex1: string, hex2: string, n: number) {
    // normalize inputs
    function normalize(h: string) {
        if (typeof h !== 'string') throw new TypeError('hex must be a string');
        h = h.trim().replace(/^#/, '');
        if (h.length === 3) { // expand short form e.g. "f0a" -> "ff00aa"
            h = h.split('').map(ch => ch + ch).join('');
        }
        if (h.length !== 6) throw new Error('Invalid hex color: ' + h);
        return h.toLowerCase();
    }

    function hexToRgb(h: string) {
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16)
        };
    }

    function rgbToHex({ r, g, b }: { r: number, g: number, b: number }) {
        const to2 = (v: number) => v.toString(16).padStart(2, '0');
        return '#' + to2(r) + to2(g) + to2(b);
    }

    if (!Number.isFinite(n)) throw new TypeError('n must be a finite number');
    n = Math.floor(n);

    if (n <= 0) return [];
    const h1 = normalize(hex1);
    const h2 = normalize(hex2);
    const c1 = hexToRgb(h1);
    const c2 = hexToRgb(h2);

    if (n === 1) return [rgbToHex(c1)];

    const out = [];
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1); // 0..1 inclusive
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        out.push(rgbToHex({ r, g, b }));
    }
    return out;
}

/**
 * Generate an array of visually distinct hex colors by spacing hues evenly.
 * @param count Number of colors to generate (integer >= 0)
 * @param saturation Saturation percent (0–100), default 70
 * @param lightness Lightness percent (0–100), default 50
 * @returns Array of hex color strings like "#A1B2C3"
 */
export function generateHueColors(
    count: number,
    saturation: number = 70,
    lightness: number = 50
): string[] {
    count = Math.floor(Number(count) || 0);
    if (count <= 0) return [];
    if (count === 1) return [hslToHex(0, saturation, lightness)];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360) / count; // evenly spaced hues
        colors.push(hslToHex(hue, saturation, lightness));
    }
    return colors;
}

/**
 * Convert HSL color to hex string (#RRGGBB)
 * @param h Hue in degrees [0, 360)
 * @param s Saturation percent [0, 100]
 * @param l Lightness percent [0, 100]
 */
function hslToHex(h: number, s: number, l: number): string {
    s = clamp(s / 100, 0, 1);
    l = clamp(l / 100, 0, 1);

    const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hk = ((h % 360) + 360) % 360 / 360; // normalized hue [0,1)
        r = hue2rgb(p, q, hk + 1 / 3);
        g = hue2rgb(p, q, hk);
        b = hue2rgb(p, q, hk - 1 / 3);
    }

    const toHex = (v: number): string =>
        Math.round(v * 255)
            .toString(16)
            .padStart(2, "0")
            .toUpperCase();

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp(x: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, x));
}
