# MinIO Natív Telepítése VPS-re

Ez a dokumentáció részletesen leírja, hogyan telepíthetsz natív MinIO szervert egy VPS-re, amely S3-kompatibilis objektumtárolóként szolgál a Vendure assetok számára.

## 1. MinIO Letöltése és Telepítése

```bash
# Frissítsd a rendszert
sudo apt update && sudo apt upgrade -y

# MinIO bináris letöltése (Linux AMD64)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Ellenőrzés
minio --version
```

## 2. MinIO Felhasználó és Mappa Létrehozása

```bash
# MinIO felhasználó létrehozása
sudo useradd -r -s /bin/false -d /opt/minio minio

# Adatkönyvtár létrehozása
sudo mkdir -p /opt/minio/data
sudo mkdir -p /etc/minio

# Jogosultságok beállítása
sudo chown -R minio:minio /opt/minio
sudo chmod 755 /opt/minio/data
```

## 3. MinIO Konfiguráció

```bash
# Környezeti változók fájl létrehozása
sudo nano /etc/default/minio
```

Tartalma:
```bash
# /etc/default/minio

# MinIO root felhasználó (admin)
MINIO_ROOT_USER="admin"
MINIO_ROOT_PASSWORD="YourSecurePassword123!"

# Adatkönyvtár
MINIO_VOLUMES="/opt/minio/data"

# Konzol címe (admin felület)
MINIO_OPTS="--console-address :9001"

# Időzóna
TZ="Europe/Budapest"
```

```bash
# Fájl jogosultságok
sudo chmod 640 /etc/default/minio
sudo chown root:minio /etc/default/minio
```

## 4. Systemd Service Létrehozása

```bash
sudo nano /etc/systemd/system/minio.service
```

Tartalma:
```ini
[Unit]
Description=MinIO Object Storage
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/opt/minio

User=minio
Group=minio

EnvironmentFile=/etc/default/minio
ExecStartPre=/bin/bash -c "if [ -z \"${MINIO_VOLUMES}\" ]; then echo \"Variable MINIO_VOLUMES not set in /etc/default/minio\"; exit 1; fi"

ExecStart=/usr/local/bin/minio server $MINIO_VOLUMES $MINIO_OPTS

# Restart policy
Restart=always
RestartSec=5

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/minio

# Limits
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity

[Install]
WantedBy=multi-user.target
```

## 5. Service Elindítása

```bash
# Service betöltése
sudo systemctl daemon-reload

# MinIO engedélyezése és indítása
sudo systemctl enable minio
sudo systemctl start minio

# Státusz ellenőrzése
sudo systemctl status minio

# Logok megtekintése
sudo journalctl -u minio -f
```

## 6. Nginx Konfiguráció

```bash
sudo nano /etc/nginx/sites-available/minio.need-shit.fun
```

Tartalma:
```nginx
# MinIO API és static fájlok
server {
    listen 80;
    server_name minio.need-shit.fun;

    # Fájl feltöltés méret limit (termékképekhez)
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # MinIO specifikus beállítások
        proxy_connect_timeout 300;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        chunked_transfer_encoding off;
    }
}

# MinIO Admin Console (opcionális)
server {
    listen 80;
    server_name minioadmin.need-shit.fun;  # MinIO admin felület domain neve

    location / {
        proxy_pass http://127.0.0.1:9001;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket támogatás admin felülethez
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Site engedélyezése
sudo ln -s /etc/nginx/sites-available/minio.need-shit.fun /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Tűzfal Beállítása

```bash
# UFW esetén
sudo ufw allow 9000/tcp comment "MinIO API"
sudo ufw allow 9001/tcp comment "MinIO Console"

# Vagy iptables esetén
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9001 -j ACCEPT
```

## 8. Bucket Létrehozása

```bash
# MinIO Client telepítése
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# MinIO szerver hozzáadása
mc alias set local http://localhost:9000 admin YourSecurePassword123!

# Bucket létrehozása
mc mb local/vendure-assets

# Bucket public olvasási jogok (ha szükséges)
mc anonymous set public local/vendure-assets
```

## 9. DNS Propagáció és SSL Tanústvány (Certbot)

### DNS Propagáció ellenőrzése

Mielőtt SSL tanústványt igényelnél, győződj meg róla, hogy a DNS rekordok megfelelően propagálódtak:

```bash
# DNS propagáció ellenőrzése mindegyik domain-re
nslookup minio.need-shit.fun
dig minio.need-shit.fun

nslookup minioadmin.need-shit.fun
dig minioadmin.need-shit.fun

# Alternatív ellenőrzés online eszközzel
# Látogass el: https://dnschecker.org/ és ellenőrizd mindegyik domain-t
```

A DNS propagáció akár 24-48 órát is igénybe vehet, bár általában gyorsabb.

### SSL Tanústvány telepítése

```bash
# Certbot telepítése
sudo apt install certbot python3-certbot-nginx -y

# SSL tanústvány kérése a fő és admin domain-re
sudo certbot --nginx -d minio.need-shit.fun -d minioadmin.need-shit.fun

# Megjegyzés: Ha probléma lépne fel, próbáld meg külön-külön igényelni a tanústványokat
# sudo certbot --nginx -d minio.need-shit.fun
# sudo certbot --nginx -d minioadmin.need-shit.fun
```

### Alternatív megoldás

Ha problémák lépnek fel a domain névvel, próbáld meg ezeket a lépéseket:

```bash
# 1. Ellenőrizd a DNS propagációt mindegyik domain-re
nslookup minio.need-shit.fun
nslookup minioadmin.need-shit.fun

# 2. Próbáld meg külön-külön igényelni a tanústványokat
sudo certbot --nginx -d minio.need-shit.fun
sudo certbot --nginx -d minioadmin.need-shit.fun
```

## 10. Monitoring és Karbantartás

```bash
# Státusz ellenőrzése
sudo systemctl status minio

# Logok
sudo journalctl -u minio -n 50

# Disk használat
mc admin info local

# Performance stats
mc admin prometheus metrics local
```

## 11. Vendure Konfiguráció

A Vendure alkalmazásban a következő környezeti változókat kell beállítani a MinIO VPS használatához:

```bash
# Asset kezelés beállításai
USE_ASSET_STORAGE=advanced

# Asset URL prefix - ahonnan a képek elérhetőek lesznek
ASSET_URL_PREFIX=https://minio.need-shit.fun/vendure-assets/

# S3/MinIO beállítások
S3_BUCKET=vendure-assets
S3_ACCESS_KEY_ID=admin
S3_SECRET_ACCESS_KEY=YourSecurePassword123!
S3_ENDPOINT=https://minio.need-shit.fun
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

## 12. Hibaelhárítás

### Domain név problémák

Ha problémák lépnek fel a domain névvel (pl. a Let's Encrypt tanústvány igénylésekor):

1. Ellenőrizd, hogy a domain név helyesen van-e írva (kötőjel használata, érvénytelen karakterek, stb.)
2. Ellenőrizd, hogy a DNS rekordok megfelelően be vannak-e állítva és propagálódtak-e
3. Próbálj egyszerűbb domain neveket használni (pl. kerüld a kötőjeleket vagy speciális karaktereket)
4. Ellenőrizd a Let's Encrypt naplófájlokat: `sudo cat /var/log/letsencrypt/letsencrypt.log`

### CORS Problémák

Ha CORS hibákat tapasztalsz (pl. a képek nem jelennek meg a frontend oldalon), állítsd be a CORS szabályokat a MinIO-ban:

```bash
# CORS konfiguráció létrehozása
cat > cors.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::vendure-assets/*"]
    }
  ]
}
EOF

# CORS konfiguráció alkalmazása
mc anonymous policy set-json cors.json local/vendure-assets
```

### Képek nem jelennek meg

1. Ellenőrizd, hogy a bucket publikus olvasási jogokkal rendelkezik:
   ```bash
   mc anonymous get local/vendure-assets
   ```

2. Ellenőrizd, hogy az `ASSET_URL_PREFIX` helyesen van beállítva és tartalmazza a bucket nevét is:
   ```
   ASSET_URL_PREFIX=https://minio.need_shit.fun/vendure-assets/
   ```

3. Ellenőrizd a MinIO logokat:
   ```bash
   sudo journalctl -u minio -f
   ```

### Kapcsolódási problémák

1. Ellenőrizd, hogy a MinIO szerver fut:
   ```bash
   sudo systemctl status minio
   ```

2. Ellenőrizd, hogy a tűzfal engedélyezi a 9000-es és 9001-es portokat:
   ```bash
   sudo ufw status
   ```

3. Ellenőrizd az Nginx konfigurációt:
   ```bash
   sudo nginx -t
   ```

## 13. Biztonsági Megfontolások

1. **Erős jelszavak**: Használj erős jelszavakat a MinIO admin felhasználóhoz.

2. **Rendszeres biztonsági mentések**: Állíts be rendszeres biztonsági mentéseket a MinIO adatokról.

3. **Frissítések**: Tartsd naprakészen a MinIO szervert a legújabb biztonsági frissítésekkel.

4. **Hozzáférés korlátozása**: Korlátozd az admin felület elérését IP cím alapján az Nginx konfigurációban.

5. **Monitoring**: Állíts be monitoring rendszert a MinIO szerver figyelésére.
