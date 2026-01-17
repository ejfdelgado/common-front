import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

export class CommonComponent {
    cache: { [key: string]: SafeHtml } = {};

    constructor(
        public sanitizer: DomSanitizer
    ) {

    }

    public sanitizeText(text: string) {
        if (text in this.cache) {
            return this.cache[text];
        } else {
            this.cache[text] = this.sanitizer.bypassSecurityTrustHtml(text);
            return this.cache[text];
        }
    }
}