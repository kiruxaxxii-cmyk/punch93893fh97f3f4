# Punch Loader (C++ WebView2)

Лоадер в стиле zetax: frameless окно, карусель экранов, боковая панель настроек.

## Экраны

1. **Авторизация** — логин / пароль или вход через сайт
2. **Главное меню** — баннер, Запустить, Сайт, Настройки
3. **Настройки** — ник, RAM, доп. панель (тема / язык)
4. **Загрузка** — прогресс-бар при запуске

## Сборка

```bat
cd loader
build.bat
```

Запуск: `build\Release\punch-loader.exe`

## Сайт

API: `https://punchdlc.up.railway.app/api`

UI лоадера на сайте: `/loader-app/` (fallback если рядом с exe нет папки `ui`).

Перед деплоем: `npm run sync-loader-ui`

Конфиг: `%LOCALAPPDATA%\Punch\loader.json`
