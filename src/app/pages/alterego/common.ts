import { Base64 } from "@tools/Base64";
import { getUrlQueryParams } from "@tools/UrlUtil";

export function getClientRef() {
    const params = getUrlQueryParams();
    const ref = params.get("ref");
    const oldLocal = localStorage.getItem("ref");
    if (typeof ref == "string" && ref.length > 0) {
        const decoded = JSON.parse(Base64.decode(ref));
        localStorage.setItem("ref", ref);
        return { decoded, ref };
    } else if (oldLocal) {
        const decoded = JSON.parse(Base64.decode(oldLocal));
        return { decoded, ref: oldLocal };
    }
    return null;
}