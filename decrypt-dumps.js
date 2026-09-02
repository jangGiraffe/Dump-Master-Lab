import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DUMP_DIR = path.join(__dirname, 'public', 'dump');
const DECRYPT_OUT_DIR = path.join(__dirname, 'tmp', 'decrypted-dumps');
const SECRET_KEY = process.env.VITE_DATA_ENCRYPTION_KEY;

if (!SECRET_KEY) {
    console.error("Error: VITE_DATA_ENCRYPTION_KEY is not defined in .env file.");
    process.exit(1);
}

// Function to decrypt data
function decryptData(encryptedString, key) {
    const bytes = CryptoJS.AES.decrypt(encryptedString, key);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Function to process files
function processFiles() {
    if (!fs.existsSync(DUMP_DIR)) {
        console.error(`Dump directory not found: ${DUMP_DIR}`);
        return;
    }

    if (!fs.existsSync(DECRYPT_OUT_DIR)) {
        fs.mkdirSync(DECRYPT_OUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(DUMP_DIR);
    let decryptedCount = 0;

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const srcPath = path.join(DUMP_DIR, file);
            const destPath = path.join(DECRYPT_OUT_DIR, file);

            try {
                const rawData = fs.readFileSync(srcPath, 'utf8');
                const jsonData = JSON.parse(rawData);

                // Check if it's actually encrypted
                if (jsonData.encryptedData) {
                    const decrypted = decryptData(jsonData.encryptedData, SECRET_KEY);
                    fs.writeFileSync(destPath, JSON.stringify(decrypted, null, 2));
                    console.log(`Decrypted & Saved: ${file}`);
                    decryptedCount++;
                } else {
                    console.log(`Skipped (not encrypted): ${file}`);
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err.message);
            }
        }
    });

    console.log(`\nDecryption complete. Check the '${DECRYPT_OUT_DIR}' directory.`);
    console.log(`Decrypted: ${decryptedCount}`);
}

processFiles();
