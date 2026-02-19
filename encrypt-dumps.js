import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, 'unencrypted-dumps');
const DUMP_DIR = path.join(__dirname, 'public', 'dump');
const SECRET_KEY = process.env.VITE_DATA_ENCRYPTION_KEY;

if (!SECRET_KEY) {
    console.error("Error: VITE_DATA_ENCRYPTION_KEY is not defined in .env file.");
    process.exit(1);
}

// Files to encrypt (exclude sample_questions.json from encryption, just copy)
const EXCLUDE_FILES = ['sample_questions.json'];

// Helper function to encrypt
function encryptData(data, key) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

// Function to process files
function processFiles() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    if (!fs.existsSync(DUMP_DIR)) {
        fs.mkdirSync(DUMP_DIR);
    }

    const files = fs.readdirSync(SOURCE_DIR);
    let encryptedCount = 0;
    let copiedCount = 0;

    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const srcPath = path.join(SOURCE_DIR, file);
            const destPath = path.join(DUMP_DIR, file);

            try {
                // Read original file
                const rawData = fs.readFileSync(srcPath, 'utf8');
                const jsonData = JSON.parse(rawData);

                if (EXCLUDE_FILES.includes(file)) {
                    // Copy unencrypted
                    fs.writeFileSync(destPath, JSON.stringify(jsonData, null, 2));
                    console.log(`Copied (unencrypted): ${file}`);
                    copiedCount++;
                } else {
                    // Check if accidentally already encrypted source
                    if (jsonData.encryptedData) {
                        console.warn(`Warning: Source file ${file} seems already encrypted. Copying as is to avoid double encryption.`);
                        fs.writeFileSync(destPath, JSON.stringify(jsonData, null, 2));
                        return;
                    }

                    // Encrypt
                    const encrypted = encryptData(jsonData, SECRET_KEY);
                    fs.writeFileSync(destPath, JSON.stringify({ encryptedData: encrypted }));
                    console.log(`Encrypted & Saved: ${file}`);
                    encryptedCount++;
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err.message);
            }
        }
    });

    console.log(`\nProcessing complete.`);
    console.log(`Encrypted: ${encryptedCount}`);
    console.log(`Copied: ${copiedCount}`);

    console.log(`Key used: ${SECRET_KEY}`);
}

processFiles();
