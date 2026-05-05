# Руководство по развертыванию NullControl PWA

Это пошаговая инструкция по запуску системы на чистом сервере (Ubuntu/Debian).

## 1. Подготовка сервера

Установите необходимые пакеты:
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 и Nginx
sudo npm install pm2 -g
sudo apt install nginx -y
```

## 2. Клонирование и настройка проекта

```bash
# Перейдите в папку, где будет лежать проект
cd /var/www
git clone <ВАШ_РЕПОЗИТОРИЙ> null-control
cd null-control

# Установка зависимостей
npm install
```

## 3. Переменные окружения

Создайте файл `.env.local` и вставьте данные из вашего проекта:
```bash
nano .env.local
```
Должны быть:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 4. Сборка и запуск

```bash
# Компиляция проекта
npm run build

# Запуск через PM2
pm2 start ecosystem.config.js

# Чтобы PM2 запускался сам после перезагрузки сервера
pm2 startup
pm2 save
```

## 5. Настройка HTTPS (Nginx)

Создайте конфиг сайта:
```bash
sudo nano /etc/nginx/sites-available/null-control
```
Вставьте конфиг из моего предыдущего сообщения (заменив домен). Затем:
```bash
sudo ln -s /etc/nginx/sites-available/null-control /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Для SSL (бесплатно):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ваш-домен.com
```

---

## 6. Резервное копирование (Backups)

База данных хранится в Supabase.
1. Зайдите в **Supabase Dashboard** -> **Database** -> **Backups**. Там включены ежедневные копии.
2. Для внешнего бэкапа используйте скрипт `scripts/backup.sh` (см. ниже).
