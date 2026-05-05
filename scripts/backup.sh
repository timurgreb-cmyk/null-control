#!/bin/bash

# Настройки (Заполните своими данными)
DB_NAME="postgres"
DB_USER="postgres"
DB_HOST="db.ваш-проект.supabase.co"
DB_PORT="5432"
DB_PASS="ВАШ_ПАРОЛЬ_ОТ_БАЗЫ"
BACKUP_DIR="/var/www/null-control/backups"

# Создание папки если нет
mkdir -p $BACKUP_DIR

# Имя файла с датой
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE_NAME="backup_$DATE.sql.gz"

# Выполнение бэкапа (pg_dump)
echo "Starting backup of $DB_NAME..."
export PGPASSWORD=$DB_PASS
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/$FILE_NAME

# Удаление бэкапов старше 30 дней
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup finished: $BACKUP_DIR/$FILE_NAME"
