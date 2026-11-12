import crypto from 'crypto';

// Limpiamos la llave por si se coló algún espacio accidental al configurarla en Vercel
const ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY ? process.env.MASTER_ENCRYPTION_KEY.trim() : null; 
const IV_LENGTH = 16; 

export function encryptKey(text) {
    if (!text) return null;
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
        throw new Error("CRÍTICO: MASTER_ENCRYPTION_KEY no está definida o no tiene exactamente 32 caracteres en Vercel.");
    }
    
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(String(text));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        console.error("[Seguridad] Error al encriptar datos:", error.message);
        return null;
    }
}

export function decryptKey(text) {
    if (!text) return null;
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
        throw new Error("CRÍTICO: MASTER_ENCRYPTION_KEY no está definida o no tiene exactamente 32 caracteres en Vercel.");
    }
    
    try {
        const textParts = text.split(':');
        // Previene caídas si el texto no tiene el formato iv:contenido
        if (textParts.length !== 2) throw new Error("Formato de hash inválido o corrompido.");
        
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    } catch (error) {
        console.error("[Seguridad] Error al desencriptar datos (Posible alteración):", error.message);
        // Devolvemos null en lugar de hacer explotar el servidor
        return null; 
    }
}
