import { useEffect, useState } from "react";
import { theme } from "../lib/theme.js";
import { useLanguage } from "../lib/lang.jsx";
import { apiSiteStats } from "../lib/api.js";
import { ActionButton, Reveal, BlurPanel } from "../components/shared.jsx";
import {
  HeroBadgeIcon,
  CartIcon,
  HeadphonesIcon,
  AboutBadgeIcon,
  AdvBadgeIcon,
  OptimizationIcon,
  VisualizationIcon,
  SupportIcon,
  SecurityIcon,
  CommunityIcon,
  StabilityIcon,
  StatsBadgeIcon,
  FaqBadgeIcon,
  FaqChevron,
  VideoBadgeIcon
} from "./home/icons.jsx";
import {
  HERO_COPY,
  ABOUT_COPY,
  ABOUT_LINKS,
  ADVANTAGES_COPY,
  STATS_CARDS,
  STATS_COPY,
  FAQ_COPY,
  VIDEO_COPY
} from "./home/copy.js";

const ADVANTAGE_ICONS = {
  optimization: OptimizationIcon,
  visualization: VisualizationIcon,
  support: SupportIcon,
  security: SecurityIcon,
  community: CommunityIcon,
  stability: StabilityIcon
};

function HeroSection() {
  const { locale } = useLanguage();
  const copy = HERO_COPY[locale];
  return (
    <section id="home" className="hero-section" style={theme.heroColorVars}>
      <div className="hero-section__content">
        <div className="hero-section__badge-wrap">
          <div className="hero-section__badge">
            <span className="hero-section__badge-icon" aria-hidden="true">
              <HeroBadgeIcon />
            </span>
            <span className="hero-section__badge-text">Punch</span>
          </div>
        </div>
        <h1 className="hero-section__title">
          <span className="hero-section__title-line">{copy.titleTop}</span>
          <span className="hero-section__title-line">{copy.titleBottom}</span>
        </h1>
        <p className="hero-section__description">
          <span className="hero-section__description-line">{copy.descriptionTop}</span>
          <span className="hero-section__description-line">{copy.descriptionBottom}</span>
        </p>
        <div className="hero-section__actions">
          <ActionButton to="/products" variant="primary" className="hero-section__button">
            <CartIcon />
            <span>{copy.products}</span>
          </ActionButton>
          <ActionButton to="/contacts" variant="secondary" className="hero-section__button">
            <HeadphonesIcon />
            <span>{copy.support}</span>
          </ActionButton>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const { locale } = useLanguage();
  const copy = ABOUT_COPY[locale];
  return (
    <section id="about" className="about-section" style={theme.aboutColorVars}>
      <Reveal as="div" className="about-section__inner about-section__inner--text-only" delay={0}>
        <div className="about-section__content">
          <div className="about-section__badge-wrap">
            <div className="about-section__badge">
              <span className="about-section__badge-icon" aria-hidden="true">
                <AboutBadgeIcon />
              </span>
              <span className="about-section__badge-text">{copy.badge}</span>
            </div>
          </div>
          <h2 className="about-section__title">{copy.title}</h2>
          <p className="about-section__description">{copy.description}</p>
          <div className="about-section__actions">
            {ABOUT_LINKS.map(({ key, href }) => (
              <ActionButton
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                variant="secondary"
                className="about-section__button"
                key={key}
              >
                {copy.links[key]}
              </ActionButton>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function AdvantagesSection() {
  const { locale } = useLanguage();
  const copy = ADVANTAGES_COPY[locale];
  return (
    <section id="advantages" className="advantages-section" style={theme.sectionColorVars}>
      <Reveal as="div" className="advantages-section__inner" delay={0}>
        <div className="advantages-section__intro">
          <div className="advantages-section__badge-wrap">
            <div className="advantages-section__badge">
              <span className="advantages-section__badge-icon" aria-hidden="true">
                <AdvBadgeIcon />
              </span>
              <span className="advantages-section__badge-text">{copy.badge}</span>
            </div>
          </div>
          <h2 className="advantages-section__title">{copy.title}</h2>
          <p className="advantages-section__description">{copy.description}</p>
        </div>
        <div className="advantages-section__grid">
          {copy.items.map(({ key, title, description }) => {
            const Icon = ADVANTAGE_ICONS[key];
            return (
              <article className="advantages-section__card" key={title}>
                <div className="advantages-section__card-head">
                  <span className="advantages-section__icon-wrap" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3 className="advantages-section__card-title">{title}</h3>
                </div>
                <div className="advantages-section__rule" aria-hidden="true" />
                <p className="advantages-section__card-description">{description}</p>
              </article>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function ClientStatsSection() {
  const { locale } = useLanguage();
  const copy = STATS_COPY[locale];
  const [cards, setCards] = useState(STATS_CARDS);

  useEffect(() => {
    let cancelled = false;
    apiSiteStats()
      .then((stats) => {
        if (!cancelled && !!Number.isFinite(stats.users)) {
          setCards((prev) =>
            prev.map((card) =>
              card.key === "users"
                ? { ...card, total: "" + stats.users }
                : card.key === "updates"
                  ? { ...card, total: "" + stats.updates }
                  : card.key === "daysSinceLaunch"
                    ? { ...card, total: "" + stats.daysSinceLaunch }
                    : card.key === "launches"
                      ? { ...card, total: "" + stats.launches }
                      : card
            )
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="statistics" className="client-stats-section" style={theme.sectionColorVars}>
      <Reveal as="div" className="client-stats-section__inner" delay={0}>
        <div className="client-stats-section__intro">
          <div className="client-stats-section__badge-wrap">
            <div className="client-stats-section__badge">
              <span className="client-stats-section__badge-icon" aria-hidden="true">
                <StatsBadgeIcon />
              </span>
              <span className="client-stats-section__badge-text">{copy.badge}</span>
            </div>
          </div>
          <h2 className="client-stats-section__title">{copy.title}</h2>
          <p className="client-stats-section__description">{copy.description}</p>
        </div>
        <div className="client-stats-section__grid">
          {cards.map(({ key, total, Icon }) => {
            const cardCopy = copy.cards[key];
            return (
              <BlurPanel as="article" className="client-stats-section__card" key={key}>
                <div className="client-stats-section__card-content">
                  <div className="client-stats-section__card-main">
                    <div className="client-stats-section__card-head">
                      <h3 className="client-stats-section__card-title">{cardCopy.title}</h3>
                      <span className="client-stats-section__card-icon" aria-hidden="true">
                        <Icon />
                      </span>
                    </div>
                    <p className="client-stats-section__card-description">{cardCopy.description}</p>
                  </div>
                  <div className="client-stats-section__rule" aria-hidden="true" />
                  <p className="client-stats-section__total">
                    {copy.totalCount}: <span>{total}</span>
                  </p>
                </div>
              </BlurPanel>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function FaqSection() {
  const { locale } = useLanguage();
  const copy = FAQ_COPY[locale];
  const [open, setOpen] = useState(-1);
  return (
    <section id="faq" className="faq-section" style={theme.sectionColorVars}>
      <Reveal as="div" className="faq-section__inner" delay={0}>
        <div className="faq-section__intro">
          <div className="faq-section__badge-wrap">
            <div className="faq-section__badge">
              <span className="faq-section__badge-icon" aria-hidden="true">
                <FaqBadgeIcon />
              </span>
              <span className="faq-section__badge-text">{copy.badge}</span>
            </div>
          </div>
          <h2 className="faq-section__title">{copy.title}</h2>
          <p className="faq-section__description">{copy.description}</p>
        </div>
        <div className="faq-section__list">
          {copy.items.map((item, i) => {
            const isOpen = i === open;
            return (
              <BlurPanel as="article" className="faq-section__item" key={item.title}>
                <button
                  type="button"
                  className="faq-section__trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((prev) => (prev === i ? -1 : i))}
                >
                  <span className="faq-section__question">{item.title}</span>
                  <FaqChevron open={isOpen} />
                </button>
                <div className={isOpen ? "faq-section__answer-wrap faq-section__answer-wrap--open" : "faq-section__answer-wrap"}>
                  <p className="faq-section__answer">{item.answer}</p>
                </div>
              </BlurPanel>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function VideoReviewSection() {
  const { locale } = useLanguage();
  const copy = VIDEO_COPY[locale];
  return (
    <section id="video-review" className="video-review-section" style={theme.sectionColorVars}>
      <Reveal as="div" className="video-review-section__inner" delay={0}>
        <div className="video-review-section__intro">
          <div className="video-review-section__badge-wrap">
            <div className="video-review-section__badge">
              <span className="video-review-section__badge-icon" aria-hidden="true">
                <VideoBadgeIcon />
              </span>
              <span className="video-review-section__badge-text">{copy.badge}</span>
            </div>
          </div>
          <h2 className="video-review-section__title">{copy.title}</h2>
          <p className="video-review-section__description">{copy.description}</p>
        </div>
        <div className="video-review-section__frame">
          <div className="video-review-section__preview video-review-section__preview--soon" aria-label={copy.soon}>
            <span className="video-review-section__soon">{copy.soon}</span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <AdvantagesSection />
      <ClientStatsSection />
      <FaqSection />
      <VideoReviewSection />
    </>
  );
}
