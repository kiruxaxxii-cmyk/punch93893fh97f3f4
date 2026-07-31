import { StatsUsersIcon, StatsUpdatesIcon, StatsDaysIcon, StatsLaunchesIcon } from "./icons.jsx";

export const HERO_COPY = {
  en: {
    titleTop: "Play without lags, without risk, and without",
    titleBottom: "limits - feel the true power.",
    descriptionTop: "Take your game to the next level - our optimized and secure client ensures",
    descriptionBottom: "stability, performance, and an advantage on any server.",
    products: "Products",
    support: "Support"
  },
  ru: {
    titleTop: "Играй без лагов, без риска и без",
    titleBottom: "ограничений - почувствуй настоящую мощь.",
    descriptionTop: "Выведи игру на новый уровень - наш оптимизированный и безопасный клиент",
    descriptionBottom: "даёт стабильность, производительность и преимущество на любом сервере.",
    products: "Товары",
    support: "Поддержка"
  }
};

export const ABOUT_COPY = {
  en: {
    badge: "About Us",
    title: "About Us",
    description:
      "We are a team creating Punch - a client that redefines comfort and efficiency in gaming. It is fully optimized, secure, and stable on any server. With Punch, you can focus on strategy and dominating the game while taking your gameplay to the next level.",
    empty: "Screenshots are not available yet.",
    screenshots: "Screenshots",
    screenshotAlt: (n) => "Punch screenshot " + n,
    showScreenshot: (n) => "Show screenshot " + n,
    links: { discord: "Our Discord" }
  },
  ru: {
    badge: "О нас",
    title: "О нас",
    description:
      "Мы создаём Punch - клиент, который делает игру комфортнее и эффективнее. Он оптимизирован, безопасен и стабилен на любом сервере. С Punch вы можете сосредоточиться на стратегии и доминировать в игре, выводя геймплей на новый уровень.",
    empty: "Скриншоты пока недоступны.",
    screenshots: "Скриншоты",
    screenshotAlt: (n) => "Скриншот Punch " + n,
    showScreenshot: (n) => "Показать скриншот " + n,
    links: { discord: "Наш Discord" }
  }
};

export const ABOUT_LINKS = [
  { key: "discord", href: "https://discord.gg/zRkPJjMnx" }
];

export const SCREENSHOTS = {};

export const ADVANTAGES_COPY = {
  en: {
    badge: "Advantages",
    title: "Why Choose Our Client?",
    description:
      "Our client stands out with unique features and powerful tools designed to make your experience smooth, fast, and enjoyable. Here's what makes us different:",
    items: [
      {
        key: "optimization",
        title: "Optimization",
        description:
          "Our client is carefully optimized for high performance and minimal resource usage, ensuring smooth gameplay even with multiple modules active simultaneously."
      },
      {
        key: "visualization",
        title: "Visualization",
        description:
          "The interface is designed with clarity in mind: intuitive menus, flexible HUD, and customizable display settings allow fast navigation and easy adjustment of visuals."
      },
      {
        key: "support",
        title: "Support",
        description:
          "We provide prompt and professional support to every user. Questions, suggestions, or issues are addressed quickly to maintain a seamless experience for everyone."
      },
      {
        key: "security",
        title: "Security",
        description:
          "Data privacy and protection are priorities. The client does not collect unnecessary info, avoids sharing with third parties, and all updates are thoroughly security-checked."
      },
      {
        key: "community",
        title: "Community",
        description:
          "A friendly, active community surrounds the client, sharing tips, customizations, and advice. Every contribution is valued and helps improve the experience for all users."
      },
      {
        key: "stability",
        title: "Stability",
        description:
          "Reliability is key. Each update goes through full testing to prevent bugs, ensure it works well, and let users enjoy the client without sudden crashes or issues."
      }
    ]
  },
  ru: {
    badge: "Преимущества",
    title: "Почему выбирают наш клиент?",
    description:
      "Наш клиент выделяется уникальными функциями и мощными инструментами, которые делают игру плавной, быстрой и удобной. Вот что отличает нас:",
    items: [
      {
        key: "optimization",
        title: "Оптимизация",
        description:
          "Клиент тщательно оптимизирован для высокой производительности и низкой нагрузки, поэтому игра остаётся плавной даже с несколькими активными модулями."
      },
      {
        key: "visualization",
        title: "Визуализация",
        description:
          "Интерфейс сделан понятным: удобные меню, гибкий HUD и настройки отображения помогают быстро ориентироваться и настраивать визуал под себя."
      },
      {
        key: "support",
        title: "Поддержка",
        description:
          "Мы быстро и профессионально помогаем каждому пользователю. Вопросы, предложения и проблемы обрабатываются так, чтобы опыт оставался комфортным."
      },
      {
        key: "security",
        title: "Безопасность",
        description:
          "Приватность и защита данных важны для нас. Клиент не собирает лишнюю информацию, не передаёт её третьим лицам, а обновления проходят проверку."
      },
      {
        key: "community",
        title: "Сообщество",
        description:
          "Вокруг клиента есть активное и дружелюбное сообщество, где делятся советами, настройками и идеями. Каждый вклад помогает улучшать проект."
      },
      {
        key: "stability",
        title: "Стабильность",
        description:
          "Надёжность - ключевой принцип. Каждое обновление проходит тестирование, чтобы предотвращать ошибки, вылеты и неожиданные проблемы."
      }
    ]
  }
};

export const STATS_CARDS = [
  { key: "users", total: "402", Icon: StatsUsersIcon },
  { key: "updates", total: "999", Icon: StatsUpdatesIcon },
  { key: "daysSinceLaunch", total: "70", Icon: StatsDaysIcon },
  { key: "launches", total: "7777", Icon: StatsLaunchesIcon }
];

export const STATS_COPY = {
  en: {
    badge: "Statistics",
    title: "Track the development and success of our client",
    description:
      "We are constantly developing and improving our product. Below are key indicators that reflect growth, activity, and community trust since the client launch.",
    totalCount: "Total count",
    cards: {
      users: {
        title: "Users",
        description:
          "We value every user of our client. The total number of users reflects the level of trust in the project and confirms its relevance among Minecraft players."
      },
      updates: {
        title: "Updates",
        description:
          "We regularly release updates to improve stability, add features, and fix bugs. The number of updates shows the active development of the client."
      },
      daysSinceLaunch: {
        title: "Days since launch",
        description:
          "Many days have passed since the launch, each dedicated to supporting and developing the client. This indicator highlights our reliability and long-term plans."
      },
      launches: {
        title: "Logins",
        description:
          "The number of logins reflects how often players use the client. This indicator demonstrates activity, engagement, and the growing popularity of the product."
      }
    }
  },
  ru: {
    badge: "Статистика",
    title: "Следите за развитием и успехом нашего клиента",
    description:
      "Мы постоянно развиваем и улучшаем продукт. Ниже ключевые показатели, которые отражают рост, активность и доверие сообщества с момента запуска клиента.",
    totalCount: "Всего",
    cards: {
      users: {
        title: "Пользователи",
        description:
          "Мы ценим каждого пользователя клиента. Общее число пользователей отражает уровень доверия к проекту и его актуальность среди игроков Minecraft."
      },
      updates: {
        title: "Обновления",
        description:
          "Мы регулярно выпускаем обновления, чтобы улучшать стабильность, добавлять функции и исправлять ошибки. Количество обновлений показывает активную разработку."
      },
      daysSinceLaunch: {
        title: "Дней с запуска",
        description:
          "С момента запуска прошло много дней, и каждый из них посвящён поддержке и развитию клиента. Этот показатель подчёркивает надёжность и долгосрочные планы."
      },
      launches: {
        title: "Входы",
        description:
          "Количество входов показывает, как часто игроки используют клиент. Этот показатель отражает активность, вовлечённость и рост популярности продукта."
      }
    }
  }
};

export const FAQ_COPY = {
  en: {
    badge: "FAQ",
    title: "Questions? Everything you need to know is here.",
    description:
      "Here you'll find answers to the most frequently asked questions about purchasing and using the client. If anything remains unclear, please contact support via Discord.",
    items: [
      {
        title: "How to buy the client?",
        answer:
          "Go to the Products page, select the desired subscription, and click Pay. Choose a convenient payment method: we accept SBP, cryptocurrency, and bank cards. Users from Ukraine and Europe can pay with cryptocurrency, via our FanPay, or through resellers on our Discord server tickets."
      },
      {
        title: "Client won't start?",
        answer:
          "If the client will not start, contact support. The fastest way is to create a ticket on our Discord server, and we will resolve the issue promptly."
      },
      {
        title: "Minimum system requirements?",
        answer:
          "The client requires Windows 10 or higher and an AMD or Intel processor. Currently, Linux and macOS are not supported."
      }
    ]
  },
  ru: {
    badge: "FAQ",
    title: "Есть вопросы? Здесь всё, что нужно знать.",
    description:
      "Здесь собраны ответы на частые вопросы о покупке и использовании клиента. Если что-то осталось непонятным, обратитесь в поддержку через Discord.",
    items: [
      {
        title: "Как купить клиент?",
        answer:
          "Перейдите на страницу товаров, выберите нужную подписку и нажмите оплату. Доступны удобные способы оплаты: СБП, криптовалюта и банковские карты. Пользователи из Украины и Европы могут оплатить криптовалютой, через FanPay или реселлеров в тикетах Discord."
      },
      {
        title: "Клиент не запускается?",
        answer:
          "Если клиент не запускается, обратитесь в поддержку. Быстрее всего создать тикет на нашем Discord-сервере, и мы оперативно поможем решить проблему."
      },
      {
        title: "Минимальные системные требования?",
        answer:
          "Клиент требует Windows 10 или новее и процессор AMD или Intel. Linux и macOS сейчас официально не поддерживаются."
      }
    ]
  }
};

export const VIDEO_COPY = {
  en: {
    badge: "Video review",
    title: "Watch the video review",
    description:
      "A full video review of the client will appear here soon.",
    soon: "soon",
    iframeTitle: "Video review"
  },
  ru: {
    badge: "Видеообзор",
    title: "Посмотрите видеообзор",
    description:
      "Полный видеообзор клиента появится здесь совсем скоро.",
    soon: "soon",
    iframeTitle: "Видеообзор"
  }
};
