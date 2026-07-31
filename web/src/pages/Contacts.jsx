import { hasRole } from "../lib/theme.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { ActionButton, Reveal, RouteIntro } from "../components/shared.jsx";
import TicketsWorkspace from "../components/TicketsWorkspace.jsx";
import { CONTACTS_COPY } from "./contacts/copy.js";
import { ContactsBadgeIcon, DiscordIcon, EmailIcon } from "./contacts/icons.jsx";

const CONTACT_CARDS = [
  { key: "discord", href: "https://discord.gg/zRkPJjMnx", Icon: DiscordIcon },
  { key: "email", href: "mailto:support@punch.local", Icon: EmailIcon }
];

export default function Contacts() {
  const { isAuthenticated, user } = useAuth();
  const { locale } = useLanguage();
  const copy = CONTACTS_COPY[locale];
  const isStaff = !!user && (!!user.isSystemOwner || hasRole(user.role, "Helper"));

  return (
    <section className="route-page contacts-page">
      <div className="route-page__stack">
        <Reveal delay={0}>
          <RouteIntro badgeLabel={copy.badge} badgeIcon={<ContactsBadgeIcon />} title={copy.title} description={copy.description} />
        </Reveal>
        <Reveal delay={60}>
          <div className="route-rule" />
        </Reveal>
        <div className="contacts-page__grid">
          {CONTACT_CARDS.map(({ key, href, Icon }, index) => {
            const card = copy.cards[key];
            return (
              <article className="contacts-page__card" style={{ animationDelay: 90 + index * 45 + "ms" }} key={key}>
                <div className="contacts-page__card-inner">
                  <div className="glass-icon-box contacts-page__card-icon">
                    <Icon />
                  </div>
                  <div className="contacts-page__card-copy">
                    <h2 className="contacts-page__card-title">{card.title}</h2>
                    <p className="contacts-page__card-description">{card.description}</p>
                  </div>
                  <ActionButton
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                    variant="secondary"
                    className="contacts-page__card-action"
                  >
                    {card.actionLabel}
                  </ActionButton>
                </div>
              </article>
            );
          })}
        </div>
        <Reveal delay={220}>
          {isAuthenticated ? (
            <TicketsWorkspace compactMode showComposer={!isStaff} showDeskActions={false} deskHref={isStaff ? "/support-desk" : undefined} />
          ) : (
            <section className="contacts-page__feedback">
              <div className="contacts-page__feedback-copy">
                <h2 className="contacts-page__feedback-title">{copy.supportTitle}</h2>
                <p className="contacts-page__feedback-description">{copy.supportDescription}</p>
              </div>
              <ActionButton to="/sign-in" variant="primary" className="contacts-page__submit">
                {copy.supportAction}
              </ActionButton>
            </section>
          )}
        </Reveal>
      </div>
    </section>
  );
}
