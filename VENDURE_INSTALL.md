# Vendure – telepítési jegyzet (Ubuntu 22.04 LTS)

> **Cél:** egy szűz (minimál) Ubuntu 22.04 VPS‑en üzembe helyezni a `h2oicsaba/vendure-default` projekt `s3_assets` branchét. Prod‑ban és UAT‑on *Docker Compose*‑t használunk; a natív telepítés csak fejlesztői kiegészítés.

---

## 0. Előkészületek (root felhasználóval)

```bash
# rendszer frissítése
apt update && apt upgrade -y
apt install -y git curl ca-certificates gnupg lsb-release build-essential sudo

# (opcionális) hostname
hostnamectl set-hostname vendure
```

### 0.1  Deploy user létrehozása – `needit`
```bash
adduser needit --gecos ""
# adjunk sudo‑jogot
usermod -aG sudo needit
```
Ezután **lépj ki** a root shellből, és csatlakozz újra:
```bash
ssh needit@<SERVER_IP>
```

> Minden további parancsot **needit** felhasználó futtat.

### 0.2  Kódtár helye – `/srv/vendure`
```bash
sudo mkdir -p /srv
sudo chown needit:needit /srv
cd /srv
git clone -b s3_assets https://github.com/h2oicsaba/vendure-default.git vendure
cd vendure
```

---

## A) Telepítés Docker Compose‑zal (AJÁNLOTT)

### A.1  Docker Engine + Compose plugin
```bash
# repo kulcs
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" |   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Add `needit`‑et a *docker* csoporthoz, majd lépj ki‑vissza vagy `newgrp docker`:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### A.2  Környezeti változók
```bash
# VPS‑hez készített minta
cp .env.VPS.example .env
# szerkeszd az adatbázis‑, redis‑, elastic, S3/minio és admin adatokat
```
> **Mi az `env.RAIL.example` és hogyan használd?**
> • A `*.example` fájlt **commitoljuk** a Git‑be: tartalmazza **az összes szükséges változó nevét**, de _nem_ tartalmaz érzékeny adatot (pl. valódi jelszót).
> • Telepítéskor minden környezetben (DEV, UAT, PRD) **készíts másolatot** róla – `.env` – és _ott_ töltsd ki a privát értékeket.
> • A `.env`‑t **általában nem** commitolják (és szerepel a `.gitignore`‑ban), **kivéve**, ha csak fejlesztői / nem érzékeny értékeket tartalmaz – ekkor biztonsággal verziókövetheted.
> • UAT‑on a `.env` az UAT‑specifikus host‑, bucket‑, DB‑nevek, jelszavak helye.

### A.3  Indítás
```bash
docker compose pull          # image‑ek letöltése
docker compose up -d         # postgres, redis, elastic, vendure‑server, vendure‑worker
```
*Első indítás* 30–60 mp.  
Admin UI → `http://<PUBLIC_IP>:3000/admin`  
Shop API → `http://<PUBLIC_IP>:3000/shop-api`

---

## B) Natív telepítés (opcionális, csak fejlesztéshez)

### B.1  Node.js 18 LTS + Yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
yarn --version || sudo npm i -g yarn
```

### B.2  PostgreSQL 16
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser vendure --pwprompt
sudo -u postgres createdb vendure_db -O vendure
```

### B.3  Redis 7

#### Lokális telepítés
```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

#### Railway Redis
A Railway platformon a Redis szolgáltatás automatikusan létrehozza a következő környezeti változókat:

- `REDISHOST` - A Redis szerver host neve
- `REDISPORT` - A Redis szerver portja
- `REDISPASSWORD` - A Redis szerver jelszó
- `REDISUSER` - A Redis felhasználónév (ha van)
- `REDIS_URL` - A teljes Redis kapcsolati URL

Ezeket a változókat használja a Vendure konfigurációban a BullMQJobQueuePlugin.

### B.4  Elasticsearch 7.17
```bash
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/7.x/apt stable main" |   sudo tee /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update && sudo apt install -y elasticsearch
sudo systemctl enable --now elasticsearch
```

### B.5  Projekt build & futtatás
```bash
cp env.RAIL.example .env   # töltsd ki
npm ci                 # vagy: yarn install
npm run build
npm run start:server &
npm run start:worker &
```

---

## C) Nginx reverse proxy (TLS + domain)
1. `sudo apt install -y nginx`
2. `/etc/nginx/sites-available/vendure.conf` → `proxy_pass http://127.0.0.1:3000` + header‑ek
3. `sudo ln -s /etc/nginx/sites-available/vendure.conf /etc/nginx/sites-enabled/`
4. `sudo certbot --nginx -d shop.example.com -d admin.example.com`

---

## D) Hasznos parancsok
| Cél                   | Parancs                                                   |
| --------------------- | --------------------------------------------------------- |
| Logok (Docker)        | `docker compose logs -f vendure-server`                   |
| Konténerek frissítése | `docker compose pull && docker compose up -d`             |
| Adatbázis dump        | `pg_dump -U vendure -h localhost vendure_db > backup.sql` |
| Redis queue flush     | `redis-cli FLUSHALL`                                      |

---

## E) Email template kezelés

A rendszer az email templateket a Docker image részeként kezeli, nem külső volume-ként:

- Az email sablonok a `static/email/templates` könyvtárban találhatók a Docker image-ben
- Az email teszt kimenetek a `static/email/test-emails` könyvtárba kerülnek
- Ha módosítani szeretnénk az email sablonokat, akkor a forráskódban kell változtatni és újra kell deployolni az alkalmazást
- Az email küldés módját a `USE_EMAIL` környezeti változó határozza meg:
  - `default`: Az EmailPlugin devMode-ban fut, nem küld valódi emaileket, csak naplózza őket
  - `advanced`: Az EmailPlugin SMTP transport-ot használ, a konfigurációt az `EMAIL_SMTP_*` környezeti változók határozzák meg

Ez a megközelítés biztosítja, hogy az email sablonok mindig elérhetőek legyenek, és nem kell külön volume-ot vagy tárolót konfigurálni hozzájuk.

## F) Hibakeresés
- **Vendure nem indul:** nézd meg, hogy *postgres/redis/elasticsearch* konténerek `healthy`‑k-e.
- **Képek hiányoznak:** ellenőrizd az S3/MinIO kapcsolatot, `ASSET_URL_PREFIX` és `S3_ENDPOINT`‑et.
- **Email problémák:** ellenőrizd a `USE_EMAIL` beállítást és az email környezeti változókat. Ha `advanced` módban vagy, ellenőrizd az SMTP beállításokat.

---

*A lépéseket a Docker hivatalos Ubuntu guide-ja, a NodeSource 18.x script és a projekt `docker-compose.yml` alapján állítottuk össze.*
