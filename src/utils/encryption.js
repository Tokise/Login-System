import CryptoJS from 'crypto-js';

// Note: Key is now passed dynamically, ensuring memory-only persistence.

export const encryptData = (data, key) => {
    if (!data || !key) return data;
    try {
        const stringData = JSON.stringify(data);
        return CryptoJS.AES.encrypt(stringData, key).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
};

export const decryptData = (ciphertext, key) => {
    if (!ciphertext || !key) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedString) return null;
        return JSON.parse(decryptedString);
    } catch (error) {
        // Suppress errors for cleaner console during wrong PIN attempts
        return null;
    }
};
