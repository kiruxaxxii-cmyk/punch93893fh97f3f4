import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/lang.jsx";
import { useSiteTheme } from "../lib/siteTheme.jsx";
import { ActionButton } from "./shared.jsx";

function TelegramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8V13A3 3 0 0 0 22 13V12A10 10 0 1 0 18 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COPY = {
  en: {
    text: "We are an independent project and are not affiliated with Mojang or Microsoft. Our client is developed as a third-party tool and is not an official Mojang product.",
    email: "Work email: support@punch.local",
    telegramPlaceholder: "enter your telegram",
    submit: "Submit",
    hours: "Contact us. Our office hours are from 8am to 10pm (moscow).",
    contacts: "Contacts",
    agreement: "User Agreement"
  },
  ru: {
    text: "Мы независимый проект и не связаны с Mojang или Microsoft. Наш клиент разрабатывается как сторонний инструмент и не является официальным продуктом Mojang.",
    email: "Рабочая почта: support@punch.local",
    telegramPlaceholder: "введите ваш telegram",
    submit: "Отправить",
    hours: "Свяжитесь с нами. Рабочие часы: с 8:00 до 22:00 (Москва).",
    contacts: "Контакты",
    agreement: "Соглашение"
  }
};

export default function Footer() {
  const { locale } = useLanguage();
  const { theme } = useSiteTheme();
  const copy = COPY[locale];
  const [telegram, setTelegram] = useState("");

  return (
    <footer className="site-footer" style={theme.sectionColorVars}>
      <div className="site-footer__inner">
        <div className="site-footer__content">
          <div className="site-footer__top">
            <div className="site-footer__about">
              <div className="site-footer__brand-block">
                <h2 className="site-footer__title">Punch</h2>
                <p className="site-footer__text">{copy.text}</p>
              </div>
              <p className="site-footer__mail">{copy.email}</p>
            </div>
            <div className="site-footer__form-wrap">
              <div className="site-footer__input-shell">
                <div className="site-footer__input-icon" aria-hidden="true">
                  <TelegramIcon />
                </div>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder={copy.telegramPlaceholder}
                  spellCheck={false}
                  autoComplete="off"
                  className="site-footer__input"
                />
              </div>
              <ActionButton type="button" variant="primary" className="site-footer__submit">
                <span>{copy.submit}</span>
              </ActionButton>
            </div>
          </div>
          <div className="site-footer__rule" aria-hidden="true" />
          <div className="site-footer__bottom">
            <p>{copy.hours}</p>
            <div className="site-footer__bottom-links">
              <Link to="/contacts">{copy.contacts}</Link>
              <Link to="/user-agreement">{copy.agreement}</Link>
              <a href="https://t.me/virtukid" target="_blank" rel="noreferrer" className="site-footer__glitch-link" aria-label="protected by virtukid">
                <span className="site-footer__glitch-text" data-text="protected by virtukid" aria-hidden="true">
                  protected by virtukid
                </span>
              </a>
              <p>© Punch, Inc. 2025-2026</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
