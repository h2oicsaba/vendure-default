# Asset Migráció Szkript

Ez a szkript a meglévő lokális asset fájlokat (képeket) feltölti a távoli MinIO szerverre.

## Előfeltételek

1. Node.js telepítve
2. A `.env` fájlban megfelelően beállított MinIO kapcsolódási adatok:
   - `S3_BUCKET`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_ENDPOINT`
   - `S3_REGION` (opcionális, alapértelmezett: 'us-east-1')
   - `S3_FORCE_PATH_STYLE` (opcionális, alapértelmezett: 'true')

## Telepítés

Telepítsd a szükséges függőségeket:

```bash
npm install @aws-sdk/client-s3 dotenv
```

## Használat

```bash
# TypeScript verzió (fordítás után)
npx ts-node src/plugins/s3_assets/migrate-assets.ts [forrás_könyvtár]
```

Ha nem adsz meg forrás könyvtárat, akkor alapértelmezetten a `/home/csaba/vendure_myshop/my-shop/static/assets` könyvtárat használja.

Példa:

```bash
npx ts-node src/plugins/s3_assets/migrate-assets.ts /path/to/your/assets
```

## Működés

A szkript rekurzívan végigmegy a megadott könyvtáron és minden fájlt feltölt a MinIO szerverre. A könyvtárstruktúrát megőrzi a feltöltés során.

## Hibaelhárítás

Ha hibát tapasztalsz, ellenőrizd a következőket:

1. A `.env` fájlban helyesen vannak-e beállítva a MinIO kapcsolódási adatok
2. A MinIO szerver elérhető-e a hálózaton keresztül
3. A megadott bucket létezik-e a MinIO szerveren
4. Van-e megfelelő jogosultságod a bucket írásához

## Megjegyzés

Ez egy egyszeri migrációs szkript, nem része a fő Vendure alkalmazásnak. A migráció után a szkript törölhető, ha már nincs rá szükség.
