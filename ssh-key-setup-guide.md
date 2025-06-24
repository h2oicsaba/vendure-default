
# SSH Kulcsos Autentikáció - Teljes Útmutató Hetzner VPS-hez

Ez a dokumentum lépésről lépésre bemutatja, hogyan generálj és állíts be SSH kulcsot a klienseden, majd hogyan aktiváld a szerveren a kulcsos bejelentkezést (passwordless login) root vagy más user esetén.

## 1. Kulcspár generálása a kliens gépen

```bash
ssh-keygen -t ed25519 -C "hetzner_ubuntu_laptop"
```

- Fájl neve: `~/.ssh/hetzner_ubuntu_laptop`
- `~/.ssh/hetzner_ubuntu_laptop.pub` → ezt fogjuk a szerverre másolni
- Privát kulcs: **soha ne oszd meg**

## 2. Kulcs feltöltése Hetzner Cloud fiókba

- Jelentkezz be a Hetzner Cloud konzolra.
- Navigálj: `Security → SSH Keys → Add SSH Key`
- Illeszd be a **publikus kulcs** tartalmát (`.pub` fájl)
- Nevezd el például: `hetzner_ubuntu_laptop`

> ⚠️ Fontos: ez CSAK az új VPS-ekre érvényes, meglévő gépre **nem** kerül fel automatikusan!

## 3. Lokális `~/.ssh/config` fájl beállítása

```bash
Host vendure
    HostName 91.99.193.215
    User root
    IdentityFile ~/.ssh/hetzner_ubuntu_laptop

Host minio
    HostName 91.99.75.89
    User root
    IdentityFile ~/.ssh/hetzner_ubuntu_laptop
```

Ezután:

```bash
ssh vendure
```

→ automatikusan a megfelelő kulcsot használja.

## 4. Publikus kulcs kézi másolása meglévő szerverre

### Root userhez:

```bash
ssh root@91.99.193.215
mkdir -p /root/.ssh
chmod 700 /root/.ssh

nano /root/.ssh/authorized_keys
# ide illeszd be a .pub fájl tartalmát

chmod 600 /root/.ssh/authorized_keys
```

### Nem-root userhez (pl. `needit`):

```bash
ssh needit@91.99.193.215
mkdir -p ~/.ssh
chmod 700 ~/.ssh

nano ~/.ssh/authorized_keys
# ide illeszd be a .pub fájl tartalmát

chmod 600 ~/.ssh/authorized_keys
```

> Tipp: használhatod az `ssh-copy-id` parancsot is, ha a szerveren még működik a jelszavas login:
>
> ```bash
> ssh-copy-id -i ~/.ssh/hetzner_ubuntu_laptop.pub root@91.99.193.215
> ```

## 5. Jogosultságok helyes beállítása

| Elem                    | Jogosultság     |
|-------------------------|-----------------|
| ~/.ssh/                 | `700`           |
| ~/.ssh/authorized_keys  | `600`           |
| /home/felhasznalo       | `755` vagy szigorúbb |

## 6. Automatikus release-upgrade tiltása

```bash
sudo nano /etc/update-manager/release-upgrades
# Állítsd ezt:
Prompt=never
```

> Megakadályozza, hogy az Ubuntu automatikusan 24.04 LTS-re frissítsen.

## Ellenőrzés

SSH verbose kapcsolattal:

```bash
ssh -vvv vendure
```

Nézd meg, használja-e a kulcsot, és nem kér-e jelszót.

## Használati minta

```bash
ssh vendure        # root@91.99.193.215
ssh minio          # root@91.99.75.89
```

## Megjegyzések

- A Hetzner kulcsokat mindig **új VPS létrehozásakor** rendeld hozzá.
- Meglévő VPS-re **kézzel** másold a `.pub` tartalmat.
- Kerüld el az `id_rsa` használatát — használj `ed25519` típusú kulcsot, ha lehet.
