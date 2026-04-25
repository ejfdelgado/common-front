
export async function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string = 'image/png',
    quality?: number,
) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob: Blob | null) => {
            if (!blob) {
                reject("No blob generated");
                return;
            };
            resolve(blob);
        }, mimeType, quality);
    });

}

export async function downloadCanvasImage(
    canvas: HTMLCanvasElement,
    fileName?: string,
    mimeType: string = 'image/png',
    quality?: number,
) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const name = fileName ?? `image_${year}_${month}_${day}_${hours}_${minutes}_${seconds}.png`;
    const blob = await canvasToBlob(canvas, mimeType, quality);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

}