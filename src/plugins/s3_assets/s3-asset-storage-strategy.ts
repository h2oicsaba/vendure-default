import { AssetStorageStrategy, Logger, RequestContext } from '@vendure/core';
import { createReadStream, ReadStream } from 'fs';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import path from 'path';

/**
 * S3 / MinIO asset tárolási stratégia a Vendure számára.
 * Ez a stratégia S3-kompatibilis szolgáltatásokat használ (AWS S3, MinIO, DigitalOcean Spaces, stb.)
 */
export class S3AssetStorageStrategy implements AssetStorageStrategy {
    private s3Client: S3Client;
    private bucket: string;
    private assetUrlPrefix: string;
    private logger = new Logger();

    constructor(
        private options: {
            bucket: string;
            credentials: {
                accessKeyId: string;
                secretAccessKey: string;
            };
            endpoint?: string;
            region?: string;
            forcePathStyle?: boolean;
            assetUrlPrefix?: string;
        }
    ) {
        this.bucket = options.bucket;
        this.assetUrlPrefix = options.assetUrlPrefix || '';
    }

    init() {
        this.s3Client = new S3Client({
            region: this.options.region || 'us-east-1',
            endpoint: this.options.endpoint,
            forcePathStyle: this.options.forcePathStyle,
            credentials: {
                accessKeyId: this.options.credentials.accessKeyId,
                secretAccessKey: this.options.credentials.secretAccessKey,
            },
        });

        Logger.info(`S3 Asset Storage inicializálva: ${this.options.endpoint || 'AWS S3'}`);
        Logger.info(`Bucket: ${this.bucket}`);
        Logger.info(`Asset URL prefix: ${this.assetUrlPrefix || 'Nincs beállítva'}`);
        
        return Promise.resolve();
    }

    async writeFileFromBuffer(fileName: string, data: Buffer): Promise<string> {
        const key = this.getKeyForFileName(fileName);
        
        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: data,
                    ContentType: this.getMimeType(fileName),
                })
            );
            
            Logger.debug(`Fájl feltöltve az S3-ra: ${key}`);
            return key;
        } catch (err) {
            Logger.error(`Hiba a fájl S3-ra feltöltése közben: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }

    async writeFileFromStream(fileName: string, data: ReadStream): Promise<string> {
        // Stream konvertálása Buffer-ré
        return new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            data.on('data', chunk => {
                if (Buffer.isBuffer(chunk)) {
                    chunks.push(chunk);
                } else {
                    chunks.push(Buffer.from(chunk));
                }
            });
            data.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const result = await this.writeFileFromBuffer(fileName, buffer);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
            data.on('error', reject);
        });
    }

    async readFileToBuffer(identifier: string): Promise<Buffer> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: identifier,
            });
            
            const response = await this.s3Client.send(command);
            const stream = response.Body as Readable;
            
            return new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        } catch (err) {
            Logger.error(`Hiba a fájl S3-ról olvasása közben: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }

    async readFileToStream(identifier: string): Promise<ReadStream> {
        try {
            const buffer = await this.readFileToBuffer(identifier);
            const tempFilePath = path.join(__dirname, `temp_${Date.now()}_${path.basename(identifier)}`);
            const fs = await import('fs');
            fs.writeFileSync(tempFilePath, buffer);
            
            // Cleanup function to remove the temp file after stream is consumed
            const stream = createReadStream(tempFilePath);
            stream.on('close', () => {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (e) {
                    // Ignore errors on cleanup
                }
            });
            
            return stream;
        } catch (err) {
            Logger.error(`Hiba a fájl S3-ról stream-be olvasása közben: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }

    async deleteFile(identifier: string): Promise<void> {
        try {
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: identifier,
            }));
            
            Logger.debug(`Fájl törölve az S3-ról: ${identifier}`);
        } catch (err) {
            Logger.error(`Hiba a fájl S3-ról törlése közben: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }

    async fileExists(fileName: string): Promise<boolean> {
        const key = this.getKeyForFileName(fileName);
        
        try {
            await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                })
            );
            return true;
        } catch (err) {
            return false;
        }
    }

    toAbsoluteUrl(request: unknown, identifier: string): string {
        // Ha van beállítva assetUrlPrefix, akkor azt használjuk
        if (this.assetUrlPrefix) {
            return `${this.assetUrlPrefix}${identifier}`;
        }
        
        // Egyébként az S3 bucket URL-jét használjuk
        const endpoint = this.options.endpoint || `https://s3.${this.options.region || 'us-east-1'}.amazonaws.com`;
        return `${endpoint}/${this.bucket}/${identifier}`;
    }

    private getKeyForFileName(fileName: string): string {
        // Eltávolítjuk a vezető / karaktert, ha van
        return fileName.startsWith('/') ? fileName.substring(1) : fileName;
    }

    private getMimeType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            case '.svg':
                return 'image/svg+xml';
            case '.pdf':
                return 'application/pdf';
            default:
                return 'application/octet-stream';
        }
    }
}
