export function enterFullscreen(element?: any) {
    if (!element) {
        element = document.documentElement;
    }
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { // Safari
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE11
        element.msRequestFullscreen();
    }
}

export function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { // Safari
        (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { // IE11
        (document as any).msExitFullscreen();
    }
}