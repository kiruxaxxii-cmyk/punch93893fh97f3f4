import { useLanguage } from "../lib/lang.jsx";
import { Reveal, BlurPanel, RouteIntro } from "../components/shared.jsx";

function AgreementBadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 17L13 19A1 1 0 1 0 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M14 14L16.5 16.5A1 1 0 1 0 19.5 13.5L15.62 9.62A3 3 0 0 0 11.38 9.62L10.5 10.5A1 1 0 1 1 7.5 7.5L10.31 4.69A5.79 5.79 0 0 1 17.37 3.82L17.84 4.1A2 2 0 0 0 19.26 4.35L21 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 3L22 14H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3L2 14L8.5 20.5A1 1 0 1 0 11.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const AGREEMENT_COPY = {
  en: {
    badge: "User Agreement",
    title: "User Agreement",
    description:
      "These are the terms and conditions for using our client. Please read them carefully to understand your rights and responsibilities when using our product. By using the client, you agree to be bound by these terms.",
    lastUpdate: "Last update: 07.01.2026",
    welcome:
      "Welcome to the Punch website. Before using the site, make sure you carefully read this document - continued use of the site constitutes acceptance of its terms.",
    sections: [
      {
        title: "Project Independence",
        paragraphs: [
          "Punch is an independent project. It is not an official product of Mojang Studios, Microsoft, or other Minecraft copyright holders and does not have their official support. All elements on the site are created and maintained by the project team or contributors."
        ]
      },
      {
        title: "Acceptance of Terms",
        paragraphs: [
          "Any actions on the site, including registration, download, and payment, are considered acceptance of this agreement. We may periodically update the text, so please check the current version when using the product."
        ]
      },
      {
        title: "Registration, Accounts, and Device Linking",
        items: [
          "Registration is required to access paid content and download via the loader.",
          "During registration, you provide contact information such as nickname and email. This data is necessary for the service and communication with you.",
          "To protect access, we may link the account to a specific device using a unique identifier (HWID). This helps prevent unauthorized access and abuse.",
          "For additional security, users can link their account to Google, Discord, or another authenticator.",
          "You are responsible for the security of your account data and must not share it with third parties. If you suspect a compromise, immediately notify support."
        ]
      },
      {
        title: "Permitted and Prohibited Actions",
        paragraphs: ["Brief overview of usage rules:"],
        items: [
          "Permitted: download and run the client for personal gameplay and use built-in features.",
          "Prohibited: distributing the client further, selling access, or sharing accounts with third parties.",
          "Prohibited: attempting to modify the code, reverse-engineer, or bypass built-in protection mechanisms.",
          "Prohibited: using the client for malicious actions, interfering with others infrastructure, or committing fraud."
        ]
      },
      {
        title: "Payments and Subscriptions",
        paragraphs: [
          "Paid services are activated after successful payment through integrated payment systems. Payment grants access to features according to the selected plan."
        ],
        items: [
          "Activation occurs automatically after the transaction is confirmed.",
          "Refunds are possible only for technical reasons, such as access issues or accidental activation. Requests for refunds without reason are not considered.",
          "We reserve the right to change subscription prices and terms, publishing updates on the site."
        ]
      },
      {
        title: "Security and Responsibility",
        paragraphs: [
          "We make efforts to ensure reliable service, but cannot guarantee absolute error-free operation on all configurations."
        ],
        items: [
          "We are not responsible for game account bans imposed by third-party services.",
          "We do not guarantee full compatibility with custom or pirated OS and software builds.",
          "In case of damages, the maximum liability is limited to the amount paid for the specific service unless otherwise required by law."
        ]
      },
      {
        title: "Personal Data Processing",
        paragraphs: [
          "We only process data necessary for service operation: email, nickname, UID, registration date, and device HWID. These are used for authorization, security, and service delivery."
        ],
        items: [
          "We do not share your personal data with third parties without your consent, except as required by law.",
          "You can request access to your data, correction, or deletion."
        ]
      },
      {
        title: "Minimum Requirements",
        items: [
          "OS: Windows 10 or newer.",
          "Graphics: a discrete graphics card is recommended; integrated graphics may not be supported.",
          "Other operating systems and mobile platforms are not officially supported."
        ]
      },
      {
        title: "Support and Contacts",
        paragraphs: [
          "For questions, complaints, or data change requests, contact support@punch.local or use the feedback form in the Contacts section."
        ]
      }
    ]
  },
  ru: {
    badge: "Пользовательское соглашение",
    title: "Пользовательское соглашение",
    description:
      "Это условия использования нашего клиента. Внимательно прочитайте их, чтобы понимать свои права и обязанности при использовании продукта. Используя клиент, вы соглашаетесь с этими условиями.",
    lastUpdate: "Последнее обновление: 07.01.2026",
    welcome:
      "Добро пожаловать на сайт Punch. Перед использованием сайта внимательно прочитайте этот документ - продолжение использования означает принятие его условий.",
    sections: [
      {
        title: "Независимость проекта",
        paragraphs: [
          "Punch является независимым проектом. Он не является официальным продуктом Mojang Studios, Microsoft или других правообладателей Minecraft и не имеет их официальной поддержки. Все элементы сайта созданы и поддерживаются командой проекта или участниками."
        ]
      },
      {
        title: "Принятие условий",
        paragraphs: [
          "Любые действия на сайте, включая регистрацию, загрузку и оплату, считаются принятием этого соглашения. Мы можем периодически обновлять текст, поэтому проверяйте актуальную версию при использовании продукта."
        ]
      },
      {
        title: "Регистрация, аккаунты и привязка устройства",
        items: [
          "Регистрация необходима для доступа к платному контенту и загрузки через loader.",
          "При регистрации вы предоставляете контактные данные, например никнейм и email. Эти данные нужны для работы сервиса и связи с вами.",
          "Для защиты доступа мы можем привязать аккаунт к конкретному устройству через уникальный идентификатор (HWID). Это помогает предотвращать несанкционированный доступ и злоупотребления.",
          "Для дополнительной безопасности пользователи могут привязать аккаунт к Google, Discord или другому аутентификатору.",
          "Вы отвечаете за безопасность данных аккаунта и не должны передавать их третьим лицам. Если вы подозреваете взлом, немедленно сообщите в поддержку."
        ]
      },
      {
        title: "Разрешённые и запрещённые действия",
        paragraphs: ["Краткий обзор правил использования:"],
        items: [
          "Разрешено: загружать и запускать клиент для личной игры и использовать встроенные функции.",
          "Запрещено: распространять клиент, продавать доступ или передавать аккаунты третьим лицам.",
          "Запрещено: пытаться изменять код, выполнять reverse-engineering или обходить встроенные механизмы защиты.",
          "Запрещено: использовать клиент для вредоносных действий, вмешательства в чужую инфраструктуру или мошенничества."
        ]
      },
      {
        title: "Платежи и подписки",
        paragraphs: [
          "Платные услуги активируются после успешной оплаты через подключённые платёжные системы. Оплата предоставляет доступ к функциям согласно выбранному плану."
        ],
        items: [
          "Активация происходит автоматически после подтверждения транзакции.",
          "Возврат возможен только по техническим причинам, например при проблемах с доступом или случайной активации. Запросы на возврат без причины не рассматриваются.",
          "Мы оставляем за собой право изменять цены и условия подписок, публикуя обновления на сайте."
        ]
      },
      {
        title: "Безопасность и ответственность",
        paragraphs: [
          "Мы стараемся обеспечивать надёжную работу сервиса, но не можем гарантировать абсолютное отсутствие ошибок на всех конфигурациях."
        ],
        items: [
          "Мы не несём ответственность за блокировки игровых аккаунтов, наложенные сторонними сервисами.",
          "Мы не гарантируем полную совместимость с кастомными или пиратскими сборками ОС и ПО.",
          "В случае ущерба максимальная ответственность ограничена суммой, оплаченной за конкретную услугу, если иное не требуется законом."
        ]
      },
      {
        title: "Обработка персональных данных",
        paragraphs: [
          "Мы обрабатываем только данные, необходимые для работы сервиса: email, никнейм, UID, дату регистрации и HWID устройства. Они используются для авторизации, безопасности и предоставления услуги."
        ],
        items: [
          "Мы не передаём персональные данные третьим лицам без вашего согласия, кроме случаев, предусмотренных законом.",
          "Вы можете запросить доступ к своим данным, их исправление или удаление."
        ]
      },
      {
        title: "Минимальные требования",
        items: [
          "ОС: Windows 10 или новее.",
          "Графика: рекомендуется дискретная видеокарта; встроенная графика может не поддерживаться.",
          "Другие операционные системы и мобильные платформы официально не поддерживаются."
        ]
      },
      {
        title: "Поддержка и контакты",
        paragraphs: [
          "По вопросам, жалобам или запросам на изменение данных пишите на support@punch.local или используйте форму обратной связи в разделе Контакты."
        ]
      }
    ]
  }
};

export default function Agreement() {
  const { locale } = useLanguage();
  const copy = AGREEMENT_COPY[locale];
  return (
    <section className="route-page agreement-page">
      <div className="route-page__stack">
        <Reveal delay={0}>
          <RouteIntro badgeLabel={copy.badge} badgeIcon={<AgreementBadgeIcon />} title={copy.title} description={copy.description} />
        </Reveal>
        <Reveal delay={70}>
          <div className="agreement-page__meta">{copy.lastUpdate}</div>
        </Reveal>
        <BlurPanel as="section" className="agreement-page__content" delay={120}>
          <BlurPanel className="agreement-page__welcome">
            <p>{copy.welcome}</p>
          </BlurPanel>
          {copy.sections.map((section) => (
            <section className="agreement-page__section" key={section.title}>
              <h2 className="agreement-page__section-title">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p className="agreement-page__paragraph" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.items ? (
                <ul className="agreement-page__list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </BlurPanel>
      </div>
    </section>
  );
}
