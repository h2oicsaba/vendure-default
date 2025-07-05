# SMTP Szerver Telepítési Útmutató

Ez a dokumentum részletesen leírja, hogyan állíts be egy SMTP szervert a VPS-en a Vendure alkalmazás számára.

## 1. DNS Beállítások

A DNS beállításokat a domain regisztrátornál vagy DNS szolgáltatónál kell elvégezni. A következő rekordokat kell létrehozni:

### A rekord
- **Név**: `mail`
- **Érték**: `91.99.75.89` (a VPS IP-címe)
- **TTL**: 1800 (vagy a szolgáltató által ajánlott érték)

### MX rekord
- **Név**: (üres, vagy `@`)
- **Érték**: `mail.need-shit.fun`
- **Prioritás**: 10
- **TTL**: 1800

### TXT rekord (SPF)
- **Név**: (üres, vagy `@`)
- **Érték**: `v=spf1 a mx ip4:91.99.75.89 ~all`
- **TTL**: 1800

**Fontos**: A DNS változások propagációja 1-24 órát is igénybe vehet, ezért türelmesnek kell lenni.

## 2. Postfix Telepítése a VPS-en

### Telepítés
```bash
sudo apt update
sudo apt install postfix
```

A telepítés során válaszd az "Internet Site" opciót, és add meg a `need-shit.fun` domain nevet.

### Konfiguráció
A Postfix konfigurációs fájlja a `/etc/postfix/main.cf`. Ezt a fájlt a következő tartalommal kell felülírni:

```
# See /usr/share/postfix/main.cf.dist for a commented, more complete version

# Debian specific:  Specifying a file name will cause the first
# line of that file to be used as the name.  The Debian default
# is /etc/mailname.
#myorigin = /etc/mailname

smtpd_banner = $myhostname ESMTP $mail_name (Ubuntu)
biff = no

# appending .domain is the MUA's job.
append_dot_mydomain = no

# Uncomment the next line to generate "delayed mail" warnings
#delay_warning_time = 4h

readme_directory = no

# See http://www.postfix.org/COMPATIBILITY_README.html -- default to 3.6 on
# fresh installs.
compatibility_level = 3.6

# TLS parameters
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level=may

smtp_tls_CApath=/etc/ssl/certs
smtp_tls_security_level=may
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination
myhostname = mail.need-shit.fun
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
myorigin = need-shit.fun
mydestination = $myhostname, need-shit.fun, localhost.localdomain, localhost
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = all

# Engedélyezés hitelesítés nélküli küldéshez a Vendure számára
smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination
```

### Postfix Újraindítása
```bash
sudo systemctl restart postfix
```

### Ellenőrzés
```bash
sudo systemctl status postfix
```

## 3. Felhasználó Létrehozása

Hozz létre egy felhasználót a `noreply@need-shit.fun` email cím számára:

```bash
sudo useradd -m -s /bin/false noreply
sudo passwd noreply
# Add meg az "erős_jelszó_ide" jelszót
```

## 4. Tűzfal Beállítása

Engedélyezd a szükséges portokat a tűzfalon:

```bash
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
```

## 5. Email Küldés Tesztelése

A telepítés után teszteld az email küldést:

```bash
echo "Ez egy teszt email" | mail -s "Teszt" your_email@example.com
```

Cseréld ki a "your_email@example.com"-ot a saját email címedre.

## 6. Vendure Konfigurálása

A Vendure alkalmazást a következő környezeti változókkal kell konfigurálni a Railway-en:

```toml
# SMTP beállítások az európai VPS-en futó SMTP szerverhez
EMAIL_SMTP_HOST = "mail.need-shit.fun"
EMAIL_SMTP_PORT = "25"
EMAIL_SMTP_USER = "noreply@need-shit.fun"
EMAIL_SMTP_PASS = "erős_jelszó_ide"
EMAIL_SMTP_SECURE = "false"
EMAIL_FROM_ADDRESS = "\"Vendure Store\" <noreply@need-shit.fun>"
```

## 7. Hibaelhárítás

### Email Naplók Ellenőrzése
```bash
sudo tail -f /var/log/mail.log
```

### Postfix Konfiguráció Ellenőrzése
```bash
sudo postfix check
```

### DNS Beállítások Ellenőrzése
```bash
dig MX need-shit.fun
dig TXT need-shit.fun
dig A mail.need-shit.fun
```

### Reverse DNS (PTR) Beállítása
Kérd meg a VPS szolgáltatót, hogy állítsa be a reverse DNS-t a VPS IP-címéhez, hogy a `mail.need-shit.fun`-ra mutasson.

## 8. Biztonsági Tippek

### Fail2ban Telepítése
```bash
sudo apt install fail2ban
```

### TLS Beállítása (Opcionális)
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d mail.need-shit.fun
```

Ezután frissítsd a Postfix konfigurációt a tanúsítvánnyal.

## 9. Email Kézbesítési Arány Javítása

### DKIM Beállítása (Opcionális)
```bash
sudo apt install opendkim opendkim-tools
```

### DMARC Beállítása (Opcionális)
Adj hozzá egy DMARC TXT rekordot a DNS-hez:
```
_dmarc.need-shit.fun. IN TXT "v=DMARC1; p=none; sp=none; rua=mailto:admin@need-shit.fun"
```

## 10. Rendszeres Karbantartás

### Logrotate Beállítása
```bash
sudo nano /etc/logrotate.d/postfix
```

### Rendszeres Frissítések
```bash
sudo apt update
sudo apt upgrade
```
