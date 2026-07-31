import { Reveal, RouteIntro } from "../components/shared.jsx";
import TicketsWorkspace from "../components/TicketsWorkspace.jsx";

function SupportDeskBadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 11H6A2 2 0 0 1 8 13V16A2 2 0 0 1 6 18H5A2 2 0 0 1 3 16V11ZM3 11A9 9 0 1 1 21 11M21 11V16A2 2 0 0 1 19 18H18A2 2 0 0 1 16 16V13A2 2 0 0 1 18 11H21ZM21 16V18A4 4 0 0 1 17 22H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SupportDesk() {
  return (
    <section className="route-page support-desk-page">
      <div className="route-page__stack">
        <Reveal delay={0}>
          <RouteIntro
            badgeLabel="Support Desk"
            badgeIcon={<SupportDeskBadgeIcon />}
            title="Support desk"
            description="Realtime moderation workspace for Helper, Admin, and Owner roles. Take tickets, reply, close, and delete them without exposing the rest of the admin panel to helper accounts."
          />
        </Reveal>
        <Reveal delay={60}>
          <div className="route-rule" />
        </Reveal>
        <TicketsWorkspace staffMode />
      </div>
    </section>
  );
}
