import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Környezeti változók betöltése
dotenv.config();

// Ellenőrizzük, hogy a szükséges környezeti változók be vannak-e állítva
if (!process.env.S3_BUCKET) {
    throw new Error('S3_BUCKET környezeti változó nincs beállítva!');
}
if (!process.env.S3_ACCESS_KEY_ID) {
    throw new Error('S3_ACCESS_KEY_ID környezeti változó nincs beállítva!');
}
if (!process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('S3_SECRET_ACCESS_KEY környezeti változó nincs beállítva!');
}

// S3 kliens létrehozása
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

// Bucket név
const bucketName = process.env.S3_BUCKET;

// Forrás könyvtár (ezt módosíthatod)
const sourceDir = process.argv[2] || '/home/csaba/vendure_myshop/my-shop/static/assets';

// Rekurzív függvény a fájlok feltöltéséhez
async function uploadDirectory(directory: string, prefix: string = '') {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
            // Ha könyvtár, akkor rekurzívan hívjuk meg önmagunkat
            await uploadDirectory(filePath, `${prefix}${file}/`);
        } else {
            // Ha fájl, akkor feltöltjük
            const fileContent = fs.readFileSync(filePath);
            const key = `${prefix}${file}`;
            
            try {
                console.log(`Feltöltés: ${key}`);
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                        Body: fileContent,
                        ContentType: getContentType(file),
                    })
                );
                console.log(`✅ Sikeresen feltöltve: ${key}`);
            } catch (error) {
                console.error(`❌ Hiba a feltöltés során: ${key}`, error);
            }
        }
    }
}

// MIME típus meghatározása a fájl kiterjesztése alapján
function getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.txt': 'text/plain',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

// Fő függvény
async function main() {
    console.log(`🚀 Asset migráció indítása...`);
    console.log(`📁 Forrás könyvtár: ${sourceDir}`);
    console.log(`🪣 Cél bucket: ${bucketName}`);
    
    try {
        await uploadDirectory(sourceDir);
        console.log(`✅ Migráció sikeresen befejeződött!`);
    } catch (error) {
        console.error(`❌ Hiba történt a migráció során:`, error);
        process.exit(1);
    }
}

// Szkript futtatása
main();
