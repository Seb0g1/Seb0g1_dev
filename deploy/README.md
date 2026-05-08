# Деплой Seb0g1.dev на VPS (sebog1.ru → 5.129.238.210)

Архитектура:

```
internet
   │
   ▼ 80/443
┌────────────────────────────────────────────────┐
│  nginx (общий для всех сайтов сервера)         │
│   ├── server sebog1.ru → /var/www/sebog1.ru/…  │
│   ├── server other-site.ru → …                 │
│   └── …                                        │
└────────────────────────────────────────────────┘
        │ /api/, /uploads/  →  127.0.0.1:4010
        ▼
┌────────────────────────────────────────────────┐
│  Node.js API (systemd: seb0g1-api)             │
│  слушает только 127.0.0.1, порт 4010           │
└────────────────────────────────────────────────┘
        │
        ▼
/var/www/sebog1.ru/shared/  (data.json + uploads/) — переживает деплой
```

Все имена и порт уникальны, **другие сайты не задеваются**.

---

## 0. На локальной машине: первый push в GitHub

В корне проекта выполни (один раз):

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Seb0g1/Seb0g1_dev.git
git push -u origin main
```

`server/data/` и `server/uploads/` уже в `.gitignore`, так что чувствительных
данных в репо не попадёт. После любых правок:

```bash
git add .
git commit -m "..."
git push
```

---

## 1. DNS (у регистратора домена sebog1.ru)

Добавь две A-записи:

```
sebog1.ru          A  5.129.238.210
www.sebog1.ru      A  5.129.238.210
```

Жди распространения (5–60 минут).

---

## 2. На сервере (5.129.238.210)

### 2.1 Подключись по SSH и установи Node.js LTS, git, nginx, certbot

```bash
ssh root@5.129.238.210
# или ssh твой_пользователь@5.129.238.210 — везде ниже добавляй sudo

apt update
apt install -y git nginx certbot python3-certbot-nginx curl ca-certificates

# Node.js 20 (NodeSource):
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v
```

### 2.2 Подготовь каталоги и `.env`

```bash
mkdir -p /var/www/sebog1.ru/shared/data
mkdir -p /var/www/sebog1.ru/shared/uploads
chown -R www-data:www-data /var/www/sebog1.ru

# создаём .env (см. deploy/.env.example в репо)
cat > /var/www/sebog1.ru/shared/.env <<'EOF'
NODE_ENV=production
HOST=127.0.0.1
PORT=4010
ADMIN_PASSWORD=замени-на-сильный-пароль
EOF
chown www-data:www-data /var/www/sebog1.ru/shared/.env
chmod 600 /var/www/sebog1.ru/shared/.env
```

### 2.3 Установи systemd unit

```bash
# скачаем юнит из репо или скопируем вручную:
curl -fsSL -o /etc/systemd/system/seb0g1-api.service \
  https://raw.githubusercontent.com/Seb0g1/Seb0g1_dev/main/deploy/seb0g1-api.service

systemctl daemon-reload
systemctl enable seb0g1-api
```

### 2.4 Первый деплой (клон + сборка)

```bash
curl -fsSL -o /tmp/deploy.sh \
  https://raw.githubusercontent.com/Seb0g1/Seb0g1_dev/main/deploy/deploy.sh
chmod +x /tmp/deploy.sh
/tmp/deploy.sh
```

Скрипт сам:
- клонирует репозиторий в `/var/www/sebog1.ru/current`
- сделает симлинки `server/data` и `server/uploads` на `shared/...`
- поставит зависимости, соберёт `dist/`
- перезапустит сервис

Проверь: `curl -s http://127.0.0.1:4010/api/projects` должен ответить `[]`.

### 2.5 Конфиг nginx

```bash
curl -fsSL -o /etc/nginx/sites-available/sebog1.ru \
  https://raw.githubusercontent.com/Seb0g1/Seb0g1_dev/main/deploy/nginx-sebog1.ru.conf

ln -s /etc/nginx/sites-available/sebog1.ru /etc/nginx/sites-enabled/sebog1.ru

nginx -t && systemctl reload nginx
```

> Важно: ничего не правит в чужих server-блоках.
> Если у тебя уже есть `default_server` или другой сайт — он остаётся как есть.

Открой http://sebog1.ru — сайт должен работать.

### 2.6 SSL (Let's Encrypt)

```bash
certbot --nginx -d sebog1.ru -d www.sebog1.ru \
  --redirect --agree-tos -m you@example.com -n
```

`certbot` обновит конфиг nginx и поднимет HTTPS (порт 443).
Авто-обновление он настроит сам (`systemctl list-timers | grep certbot`).

---

## 3. Обновление сайта

Локально:

```bash
git add .
git commit -m "update: ..."
git push
```

На сервере:

```bash
sudo /tmp/deploy.sh
# или, если оставил скрипт в /usr/local/bin:
sudo deploy.sh
```

`shared/data/data.json` и `shared/uploads/` сохраняются — проекты и фото
не теряются между деплоями.

---

## 4. Полезные команды

```bash
# логи API
journalctl -u seb0g1-api -f -n 100

# статус
systemctl status seb0g1-api

# перезапуск
sudo systemctl restart seb0g1-api

# проверить, что nginx не поломан другими сайтами
sudo nginx -t

# бэкап данных
tar czf ~/sebog1-backup-$(date +%F).tar.gz \
  /var/www/sebog1.ru/shared/data \
  /var/www/sebog1.ru/shared/uploads
```

---

## 5. Что менять, если порт 4010 занят другим сайтом

1. В `/var/www/sebog1.ru/shared/.env` смени `PORT=4011` (любой свободный).
2. В `/etc/nginx/sites-available/sebog1.ru` поправь `proxy_pass http://127.0.0.1:4010;` → 4011.
3. `sudo systemctl restart seb0g1-api && sudo nginx -t && sudo systemctl reload nginx`.
