# S3 Asset Integráció a Vendure-hez

Ez a dokumentáció leírja, hogyan használhatod az S3-kompatibilis tárolókat (AWS S3, MinIO, DigitalOcean Spaces, stb.) a Vendure asset kezeléséhez.

A megoldás a Vendure hivatalos dokumentációján alapul: [Vendure Asset Storage](https://docs.vendure.io/guides/getting-started/installation/).

## Miért érdemes S3-kompatibilis tárolót használni?

A Railway és más modern felhő platformok gyakran nem támogatják a perzisztens köteteket, vagy azok használata korlátozott. Az S3-kompatibilis tárolók ideális megoldást jelentenek az assetok tárolására, mivel:

- Skálázhatóak és megbízhatóak
- Támogatják a CDN integrációt
- Automatikusan kezelik a képek előnézeteit
- Költséghatékonyak
- Platformfüggetlenek

## Telepítés és konfigurálás

### 1. Környezeti változók beállítása

A `.env` fájlban állítsd be a következő változókat:

```bash
# Asset kezelés beállításai
# Plugin választó az asset kezeléshez - értéke lehet "default" vagy "advanced"
# Ha "default", akkor a helyi asset kezelést használjuk
# Ha "advanced", akkor az S3/MinIO asset kezelést használjuk
USE_ASSET_STORAGE=advanced

# Asset URL prefix - csak akkor használjuk, ha USE_ASSET_STORAGE=advanced
# Ez az URL prefix lesz használva a frontend számára a képek megjelenítéséhez
ASSET_URL_PREFIX=https://your-bucket-url.com/

# S3/MinIO beállítások - csak akkor használjuk, ha USE_ASSET_STORAGE=advanced
S3_BUCKET=vendure-assets
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=https://your-s3-endpoint.com
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

### 2. MinIO szerver telepítése (opcionális, csak fejlesztéshez)

Ha lokálisan szeretnéd tesztelni az S3 integrációt, telepíthetsz egy MinIO szervert Docker segítségével:

```bash
docker run -p 9000:9000 -p 9001:9001 --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v ~/minio/data:/data \
  minio/minio server /data --console-address ":9001"
```

Ezután a MinIO adminfelülete elérhető lesz a http://localhost:9001 címen, és az S3 API a http://localhost:9000 címen.

### 3. Bucket létrehozása

Az S3 vagy MinIO adminfelületén hozz létre egy új bucketet a Vendure assetok számára (pl. `vendure-assets`).

### 4. Jogosultságok beállítása

Állítsd be a bucket jogosultságait, hogy a fájlok nyilvánosan elérhetőek legyenek. MinIO esetén ez általában alapértelmezett, de AWS S3 esetén külön be kell állítani.

## Használat

Ha a környezeti változók megfelelően be vannak állítva, a Vendure automatikusan az S3 tárolót fogja használni az assetok kezeléséhez. A feltöltött képek az S3 bucketben lesznek tárolva, és az `ASSET_URL_PREFIX` alapján lesznek elérhetőek a frontend számára.

## Hibaelhárítás

### Nem jelennek meg a képek

1. Ellenőrizd, hogy a bucket nyilvános-e
2. Ellenőrizd, hogy az `ASSET_URL_PREFIX` helyesen van-e beállítva
3. Ellenőrizd a böngésző konzolját, hogy vannak-e CORS hibák

### Feltöltési hibák

1. Ellenőrizd, hogy a hozzáférési kulcsok helyesek-e
2. Ellenőrizd, hogy a bucket létezik-e
3. Ellenőrizd, hogy a felhasználónak van-e írási jogosultsága a buckethez

## Railway-en való használat

Railway-en való használathoz állítsd be a környezeti változókat a Railway projekt beállításaiban. Használhatsz AWS S3-at, DigitalOcean Spaces-t, vagy bármely más S3-kompatibilis szolgáltatást.

### AWS S3 beállítások példa

```
USE_ASSET_STORAGE=advanced
ASSET_URL_PREFIX=https://your-bucket.s3.amazonaws.com/
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=your_aws_access_key
S3_SECRET_ACCESS_KEY=your_aws_secret_key
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=false
```

### DigitalOcean Spaces beállítások példa

```
USE_ASSET_STORAGE=advanced
ASSET_URL_PREFIX=https://your-space.nyc3.digitaloceanspaces.com/
S3_BUCKET=your-space
S3_ACCESS_KEY_ID=your_spaces_key
S3_SECRET_ACCESS_KEY=your_spaces_secret
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_FORCE_PATH_STYLE=true
```

## További fejlesztési lehetőségek

- CDN integráció (CloudFront, Cloudflare, stb.)
- Képek átméretezése és optimalizálása feltöltéskor
- Privát assetok kezelése időkorlátos URL-ekkel
- Verziókezelés és visszaállítás
