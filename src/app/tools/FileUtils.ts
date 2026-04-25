export function downloadCanvasImage(
    canvas: HTMLCanvasElement,
    fileName?: string,
) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const name = fileName ?? `image_${year}_${month}_${day}_${hours}_${minutes}_${seconds}.png`;
    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = name;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}