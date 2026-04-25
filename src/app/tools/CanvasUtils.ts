export async function paintUrlImageOnCanvas(
    url: string,
    canvas: HTMLCanvasElement,
) {
    return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx!.drawImage(img, 0, 0);
            resolve();
        };
        img.onerror = reject;
        img.src = url;
    });
}

export function drawCenteredText(
    canvas: HTMLCanvasElement,
    text: string,
    fontSizePx: number,
    sideLength: number,
    fontFamily: string = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
): void {
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Canvas 2D context not supported.");
    }

    // Clear canvas
    const emojiBackSize = fontSizePx * 1.4;
    const padding = (sideLength - emojiBackSize) / 2;
    ctx.fillStyle = 'white';
    ctx.fillRect(padding, padding, emojiBackSize, emojiBackSize);

    // Set font
    ctx.font = `${fontSizePx}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Optional: smooth text rendering
    ctx.imageSmoothingEnabled = true;

    // Draw centered text
    ctx.fillText(text.trim().substring(0, 2), sideLength / 2, sideLength / 2);
}