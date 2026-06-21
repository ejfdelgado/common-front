export class ClipboardUtil {
    /**
     * Writes text to the clipboard
     * Must be called from a user gesture (click, touch, keypress)
     */
    static async writeText(text: string): Promise<boolean> {
        // Modern API (works on most desktop & mobile browsers)
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // Fallback below
            }
        }

        return this.fallbackWriteText(text);
    }

    /**
     * Reads text from the clipboard
     * Requires user gesture + permission
     */
    static async readText(): Promise<string | null> {
        if (navigator.clipboard?.readText) {
            try {
                return await navigator.clipboard.readText();
            } catch {
                return null;
            }
        }

        // Reading is NOT possible via fallback in most browsers
        return null;
    }

    /**
     * Legacy clipboard write fallback
     * Works on older browsers and iOS Safari
     */
    private static fallbackWriteText(text: string): boolean {
        const textarea = document.createElement('textarea');
        textarea.value = text;

        // Prevent scrolling on iOS
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let success = false;
        try {
            success = document.execCommand('copy');
        } catch {
            success = false;
        }

        document.body.removeChild(textarea);
        return success;
    }

    /**
     * Checks whether clipboard write is likely supported
     */
    static canWrite(): boolean {
        return !!(
            navigator.clipboard?.writeText ||
            document.queryCommandSupported?.('copy')
        );
    }

    /**
     * Checks whether clipboard read is supported
     */
    static canRead(): boolean {
        return !!navigator.clipboard?.readText;
    }
}
