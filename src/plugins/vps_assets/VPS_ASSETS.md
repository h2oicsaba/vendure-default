# VPS alapú asset tárolás és kiszolgálás Vendure-hoz

Ez a projekt a termékképek és egyéb assetek tárolását és kiszolgálását egy saját európai VPS szerveren (Hetzner) keresztül valósítja meg, külön dedikált domainnel.

## Megoldás összefoglalása

- **Asset domain:** `assets.need-shit.fun` (A rekord a VPS IP-re mutat)
- **VPS:** Hetzner Cloud (pl. cpx11, Ubuntu)
- **Webszerver:** Nginx
- **HTTPS:** Let's Encrypt tanúsítvány (certbot)
- **Asset útvonal:** `/var/www/assets` (itt tárolódnak a képek a VPS-en)
- **Vendure assetUrlPrefix:** `https://assets.need-shit.fun`
- **Szinkronizálás:** pl. `rsync`-kel Railway vagy egyéb szerverről

## Lépések

1. **DNS beállítás**
   - `assets.need-shit.fun` A rekord a VPS IP-re (TTL: 3600)

1.b. **DNS beállítás ellenőrzése**
```bash
dig assets.need-shit.fun +short
```

2. **Asset könyvtár létrehozása a VPS-en**
   ```bash
   mkdir -p /var/www/assets
   chown -R www-data:www-data /var/www/assets
   chmod -R 755 /var/www/assets
   ```

3. **Nginx telepítése és konfigurálása**
   - Nginx telepítése: `apt install nginx -y`
   - Konfiguráció:
   ```nginx
   server {
     listen 80;
     server_name assets.need-shit.fun;
     root /var/www/assets;
     location / {
       try_files $uri $uri/ =404;
       expires 30d;
       add_header Cache-Control "public, max-age=2592000";
     }
   }
   ```
   - Aktiválás: `ln -s /etc/nginx/sites-available/assets.need-shit.fun /etc/nginx/sites-enabled/`
   - Nginx reload: `systemctl reload nginx`

4. **Let's Encrypt SSL tanúsítvány**
   - Certbot telepítése: `apt install certbot python3-certbot-nginx -y`
   - Tanúsítvány igénylése: `certbot --nginx -d assets.need-shit.fun`

5. **Vendure konfiguráció**
   ```typescript
   AssetServerPlugin.init({
     route: 'assets',
     assetUploadDir: path.join(__dirname, '../static/assets'),
     assetUrlPrefix: 'https://assets.need-shit.fun',
   })
   ```

6. **Képek szinkronizálása**
   - Railway vagy más szerverről pl. így:
   ```bash
   rsync -avz /path/to/static/assets/ user@91.99.75.89:/var/www/assets/
   ```
   - Automatizálható cronból vagy CI pipeline-ból

## Előnyök
- Gyors, európai asset kiszolgálás
- Nincs forgalomkorlát vagy extra költség
- Teljes kontroll a szerver felett
- HTTPS támogatás (böngésző-kompatibilitás)

---

Ha új asset kerül feltöltésre, azt szinkronizálni kell a VPS-re, hogy elérhető legyen a dedikált asset domainen.


## Node.js asset feltöltő szerver lépései

### 1. Node.js és npm telepítése
- Először próbáltuk a rendszer csomagkezelőjével (apt) telepíteni, de ütközés volt a régi (12-es) és az új (18-as) Node.js között.
- A hibát a `libnode-dev` csomag okozta, ezt el kellett távolítani:
  ```bash
  sudo apt remove libnode-dev
  sudo apt autoremove
  sudo apt clean
  ```
- Ezután sikerült telepíteni az új Node.js-t (pl. 18.x):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- Ellenőrzés:
  ```bash
  node -v
  npm -v
  ```

### 2. Express alapú feltöltő szerver elkészítése
- Létrehoztunk egy külön mappát: `/opt/asset-upload-server`
- Itt hoztuk létre az `upload-server.js` fájlt (Express + Multer, POST /upload endpoint)
- Inicializáltuk a projektet és telepítettük a szükséges csomagokat:
  ```bash
  npm init -y
  npm install express multer
  ```

### 3. Külön felhasználó létrehozása
- Biztonság kedvéért létrehoztunk egy assetuser nevű, nem root felhasználót:
  ```bash
  sudo adduser --system --no-create-home --group assetuser
  sudo chown -R assetuser:assetuser /opt/asset-upload-server
  sudo chown -R assetuser:www-data /var/www/assets
  sudo chmod -R 775 /var/www/assets
  ```

### 4. Szerver indítása és tesztelése
- A szervert manuálisan így lehet indítani:
  ```bash
  sudo -u assetuser node /opt/asset-upload-server/upload-server.js
  ```
- Ekkor a 3000-es porton elérhető az /upload endpoint.

#### Feltöltő szerver (upload-server.js)
- A projektben található `upload-server.js.on.VPS` fájlt másoljuk át a VPS szerverre:
  ```bash
  # Másoljuk az upload-server.js.on.VPS fájlt a VPS szerverre
  scp upload-server.js.on.VPS user@vps-ip:/opt/asset-upload-server/upload-server.js
  ```
- Ez a fejlesztett verzió megőrzi az eredeti könyvtárstruktúrát, így a képek ugyanolyan elérési úttal lesznek elérhetők a VPS-en, mint a Vendure szerverben.
- A fejlesztett szerver főbb előnyei:
  - Automatikusan létrehozza a szükséges alkönyvtárakat
  - Megtartja az eredeti fájlneveket
  - Megőrzi a Vendure által generált könyvtárstruktúrát (pl. `source/ca/legion2.jpg`)
  - Részletesebb válaszokat ad a feltöltésekről

### 5. Systemd service-ként futtatás
- Létrehoztunk egy systemd unit file-t:
  ```ini
  [Unit]
  Description=Asset Upload Express Server
  After=network.target

  [Service]
  Type=simple
  User=assetuser
  WorkingDirectory=/opt/asset-upload-server
  ExecStart=/usr/bin/node /opt/asset-upload-server/upload-server.js
  Restart=always
  Environment=NODE_ENV=production

  [Install]
  WantedBy=multi-user.target
  ```
- Mentés után:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable asset-upload
  sudo systemctl start asset-upload
  sudo systemctl status asset-upload
  ```
- Mostantól a szerver automatikusan elindul újraindítás után is, és a háttérben fut.

teszt 
curl -X POST -F "file=@/home/csaba/git/vendure-default/static/assets/source/ca/legion2.jpg" -F "originalPath=source/ca/legion2.jpg" http://91.99.75.89:3000/upload -v

### 6. Hibák és megoldások
- Node.js verzióütközés: régi csomagok eltávolítása, új Node.js telepítése
- Jogosultságok: assetuser-nek írási jog kell a /var/www/assets mappához
- Systemd service státusz: csak akkor működik, ha minden elérési út, user és jogosultság helyes

---
