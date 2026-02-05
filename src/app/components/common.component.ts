import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { FullscreenService } from "@services/fullscreen.service";
import { getBucketFilePath, getSquarePath, getThumbnailPath } from "@tools/BucketPaths";
import { epochTo } from "@tools/DateUtils";
import { isMobile } from "@tools/mobile";
import { enterFullscreen, exitFullscreen } from "@tools/ScreenUtils";

export type ImageTypeData = "big" | "thumbnail" | "square";

export abstract class CommonComponent {
    cache: { [key: string]: SafeHtml } = {};
    onChangeList: Function[] = [];
    onTouchedList: Function[] = [];
    isFullScreen: boolean = false;

    constructor(
        public sanitizer: DomSanitizer,
        public fullScreenSrv: FullscreenService,
    ) {

    }

    onChange(value: any) {
        this.onChangeList.forEach((el) => {
            el(value);
        });
    };

    onTouched() {
        this.onTouchedList.forEach((el) => {
            el();
        });
    };

    registerOnChange(fn: (value: any) => void): Function {
        const list = this.onChangeList;
        list.push(fn);
        return () => {
            const ix = list.indexOf(fn);
            if (ix >= 0) {
                list.splice(ix, 1);
            }
        }
    }

    registerOnTouched(fn: () => void): Function {
        const list = this.onTouchedList;
        list.push(fn);
        return () => {
            const ix = list.indexOf(fn);
            if (ix >= 0) {
                list.splice(ix, 1);
            }
        }
    }

    public sanitizeText(text?: string | null, max?: number) {
        if (!text) {
            return "";
        }
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
        return epochTo(millis, type);
    }

    getBucketFilePath(value: string | null) {
        return getBucketFilePath(value);
    }

    getBucketFilePathWithType(value: string, type: ImageTypeData) {
        if (type == "big") {
            return getBucketFilePath(value);
        } else if (type == "thumbnail") {
            return getBucketFilePath(getThumbnailPath(value));
        } else {
            return getBucketFilePath(getSquarePath(value));
        }
    }

    setFullScreen(value: boolean) {
        this.isFullScreen = value;
        if (value) {
            this.fullScreenSrv.enterFullscreen();
        } else {
            this.fullScreenSrv.exitFullscreen();
        }
    }
}