import { AES, enc } from 'crypto-js';
import { Buffer } from 'buffer';

export async function decryptSecret(
    pass: string,
    encryptedBuffer: string,
): Promise<string> {
    const bytes = AES.decrypt(
        Buffer.from(encryptedBuffer, "base64").toString('utf8'),
        pass
    );
    const plaintext = bytes.toString(enc.Utf8);
    return plaintext;
}
