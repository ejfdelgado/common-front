import { Buffer } from 'buffer';

export class Base64 {
    static encode(text: string) {
        return Buffer.from(text, "utf-8").toString("base64");
    }
    static decode(encoded: string) {
        return Buffer.from(encoded, "base64").toString("utf-8");
    }
}