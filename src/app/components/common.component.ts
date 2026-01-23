import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { getBucketFilePath } from "@tools/BucketPaths";
import { isMobile } from "@tools/mobile";
import moment from "moment";

export class CommonComponent {
    cache: { [key: string]: SafeHtml } = {};
    epochYearStart: number = moment().startOf('year').valueOf();

    constructor(
        public sanitizer: DomSanitizer,
    ) {

    }

    public sanitizeText(text: string, max?: number) {
        if (max) {
            if (text.length > max) {
                text = text.substring(0, max) + "...";
            }
        }
        if (text in this.cache) {
            return this.cache[text];
        } else {
            this.cache[text] = this.sanitizer.bypassSecurityTrustHtml(text);
            return this.cache[text];
        }
    }

    public isMobile() {
        return isMobile();
    }

    epochTo(millis: number, type: "v1" | "v2" | "v3" = "v1") {
        if (type == "v1") {
            // Format: "17 de enero de 2026"
            if (millis > this.epochYearStart) {
                return moment(millis).format('D [de] MMMM');
            } else {
                return moment(millis).format('LL');
            }
        } else if (type == "v2") {
            // Custom Format: "17/01/2026"
            return moment(millis).format('DD/MM/YYYY');
        } else if (type == "v3") {
            // Full string: "sábado, 17 de enero de 2026"
            return moment(millis).format('dddd, D [de] MMMM [de] YYYY');
        } else {
            throw new Error(`Type ${type} not exist`);
        }
    }

    getBucketFilePath(value: string | null) {
        return getBucketFilePath(value);
    }
}