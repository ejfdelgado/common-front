export async function paintUrlImageOnCanvas(
    url: string,
    canvas: HTMLCanvasElement,
) {
    return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx!.drawImage(img, 0, 0);
            resolve();
        };
        img.onerror = reject;
        img.src = url;
    });
}