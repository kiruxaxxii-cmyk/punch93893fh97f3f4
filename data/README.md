# Punch EBD (Единая база данных)

Runtime SQLite: **`data/punch-ebd.db`**

Канонический сид для деплоя: **`seed/punch-ebd.db`**  
(отдельно от `data/`, чтобы volume на Railway не перекрывал новую базу из git)

- При старте сид копируется в runtime, если `PUNCH_SEED_DB=1` или изменился SHA сида
- При сиде сносятся stale `*.db-wal` / `*.db-shm`
- Переменные: `PUNCH_DATA_DIR`, `PUNCH_DB_PATH`, `PUNCH_SEED_DB`

Перед пушем новой базы (чтобы не потерять WAL):

```bash
node scripts/checkpoint-ebd.js
```

В админке: вкладка **EBD** — статус, backup, удаление дубликатов.

Повторная регистрация на занятый email блокируется API и уникальными индексами.
