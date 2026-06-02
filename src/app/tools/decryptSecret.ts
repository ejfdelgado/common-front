import { JSEncrypt } from 'jsencrypt';

/**
 * Recovers the AES key by applying the RSA public operation (c^e mod n) and
 * stripping PKCS#1 Type 1 padding — the inverse of Node.js crypto.privateEncrypt.
 */
function rsaPublicDecrypt(publicKeyPem: string, encryptedKey: Uint8Array): Uint8Array {
    const jse = new JSEncrypt();
    jse.setPublicKey(publicKeyPem);
    const key = (jse as any).getKey();

    const hexStr = Array.from(encryptedKey)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');

    // eslint-disable-next-line new-cap
    const c = new (key.n.constructor)(hexStr, 16);
    const m = key.doPublic(c);

    // Pad to full key size (BigInteger drops leading 0x00)
    const keySize = Math.ceil(key.n.bitLength() / 8);
    const mHex = m.toString(16).padStart(keySize * 2, '0');
    const mBytes = new Uint8Array(keySize);
    for (let i = 0; i < keySize; i++) {
        mBytes[i] = parseInt(mHex.slice(i * 2, i * 2 + 2), 16);
    }

    // Strip PKCS#1 Type 1 padding: 0x00 | 0x01 | 0xFF... | 0x00 | message
    if (mBytes[0] !== 0x00 || mBytes[1] !== 0x01) {
        throw new Error('Invalid PKCS1 Type 1 padding');
    }
    let pos = 2;
    while (pos < mBytes.length && mBytes[pos] === 0xff) pos++;
    if (mBytes[pos] !== 0x00) throw new Error('Invalid PKCS1 padding separator');
    return mBytes.slice(pos + 1);
}

/**
 * Decrypts an ArrayBuffer produced by the backend's hybrid encryption scheme:
 *   [4-byte key_len][RSA-wrapped AES key][12-byte IV][16-byte auth tag][AES-256-GCM ciphertext]
 *
 * The RSA key was encrypted with the server's RSA private key (Node.js privateEncrypt /
 * RSA_PKCS1_PADDING), so decryption requires only the matching public key — no passphrase.
 */
export async function decryptSecret(
    publicKeyPem: string,
    encryptedBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
    const bytes = new Uint8Array(encryptedBuffer);
    const view = new DataView(encryptedBuffer);

    const keyLen = view.getUint32(0, false);              // big-endian
    const encryptedAesKey = bytes.slice(4, 4 + keyLen);
    const iv = bytes.slice(4 + keyLen, 4 + keyLen + 12);
    const authTag = bytes.slice(4 + keyLen + 12, 4 + keyLen + 28);
    const ciphertext = bytes.slice(4 + keyLen + 28);

    const aesKeyBytes = rsaPublicDecrypt(publicKeyPem, encryptedAesKey);

    const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
    );

    // Web Crypto AES-GCM expects the 16-byte auth tag appended to the ciphertext
    const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length);
    ciphertextWithTag.set(ciphertext);
    ciphertextWithTag.set(authTag, ciphertext.length);

    return crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        aesKey,
        ciphertextWithTag,
    );
}
