#!/usr/bin/env bash
# Развёртывание / обновление Seb0g1.dev на сервере.
# Запускать на сервере (Linux) от пользователя с sudo:
#
#   curl -O https://raw.githubusercontent.com/Seb0g1/Seb0g1_dev/main/deploy/deploy.sh
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# Скрипт:
# 1) клонирует/обновляет репозиторий в /var/www/sebog1.ru/current
# 2) устанавливает зависимости и собирает фронтенд (dist/)
# 3) перезапускает systemd-сервис seb0g1-api
# Состояние (data/uploads, .env) хранится в /var/www/sebog1.ru/shared
# и переживает обновления.

set -euo pipefail

APP_DIR="/var/www/sebog1.ru"
CURRENT="${APP_DIR}/current"
SHARED="${APP_DIR}/shared"
NPM_CACHE="${APP_DIR}/.npm-cache"
NPM_HOME="${APP_DIR}/.npm-home"
REPO_URL="${REPO_URL:-https://github.com/Seb0g1/Seb0g1_dev.git}"
BRANCH="${BRANCH:-main}"

echo "==> Подготавливаю каталоги"
sudo mkdir -p "${SHARED}/data" "${SHARED}/uploads" "${NPM_CACHE}" "${NPM_HOME}"
sudo chown -R www-data:www-data "${APP_DIR}"

# Возможные root-owned остатки от прошлых запусков под /var/www/.npm
sudo mkdir -p /var/www/.npm
sudo chown -R www-data:www-data /var/www/.npm

echo "==> Клонирую/обновляю репозиторий"
if [ ! -d "${CURRENT}/.git" ]; then
  sudo -u www-data git clone "${REPO_URL}" "${CURRENT}"
fi
sudo -u www-data git -C "${CURRENT}" fetch --all
sudo -u www-data git -C "${CURRENT}" checkout "${BRANCH}"
sudo -u www-data git -C "${CURRENT}" pull --ff-only

echo "==> Симлинки на персистентные данные"
sudo -u www-data mkdir -p "${CURRENT}/server"
sudo -u www-data rm -rf "${CURRENT}/server/data" "${CURRENT}/server/uploads"
sudo -u www-data ln -sfn "${SHARED}/data"    "${CURRENT}/server/data"
sudo -u www-data ln -sfn "${SHARED}/uploads" "${CURRENT}/server/uploads"

# Чистим node_modules перед npm ci, иначе будут TAR_ENTRY_ERROR от прошлой
# неудачной установки.
echo "==> Чищу старые node_modules"
sudo rm -rf "${CURRENT}/node_modules"

# ВАЖНО: env-переменные задаём внутри sh -c, чтобы npm их точно увидел.
# bash -lc / sudo чистят окружение и наши значения теряются.
echo "==> Устанавливаю зависимости"
sudo -u www-data sh -c "
  cd '${CURRENT}' &&
  HOME='${NPM_HOME}' \
  npm_config_cache='${NPM_CACHE}' \
  npm ci --no-audit --no-fund
"

echo "==> Собираю фронтенд"
sudo -u www-data sh -c "
  cd '${CURRENT}' &&
  HOME='${NPM_HOME}' \
  npm_config_cache='${NPM_CACHE}' \
  npm run build
"

echo "==> Перезапускаю API"
sudo systemctl restart seb0g1-api

echo "==> Готово. Статус:"
sudo systemctl --no-pager status seb0g1-api | head -n 10
