import crypto from 'crypto';

// Debes crear esta variable en Vercel. Debe ser un texto de exactamente 32 caracteres.
const ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY; 
const IV_LENGTH = 16; 

export function encryptKey(text) {
    if (!ENCRYPTION_KEY) throw new Error("Falta MASTER_ENCRYPTION_KEY en Vercel");
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptKey(text) {
    if (!ENCRYPTION_KEY) throw new Error("Falta MASTER_ENCRYPTION_KEY en Vercel");
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
