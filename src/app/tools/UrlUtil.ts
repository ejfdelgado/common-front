
export type ShareDataType = {
    collection: string;
    id: string;
    path: string;
    title?: string;
    description?: string;
    updated?: number;
    emoji?: string;
}

export type SharePayload = {
    title?: string;
    text?: string;
    url?: string;
};

export function getUrlQueryParams() {
    return new URLSearchParams(window.location.hash.split("?")[1]);
}

export function truncateString(max: number, val?: string) {
    if (!val) {
        return val;
    }
    if (val.length > max) {
        return val.substring(0, max) + "...";
    } else {
        return val;
    }
}