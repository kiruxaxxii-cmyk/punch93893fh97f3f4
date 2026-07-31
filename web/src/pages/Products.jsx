import { useEffect, useState } from "react";
import { apiPaymentPlans, errorMessage } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, BlurPanel, Reveal, RouteIntro } from "../components/shared.jsx";
import { PRODUCTS_COPY, formatPlanDuration } from "./products/copy.js";
import { ProductsBadgeIcon } from "./products/icons.jsx";

function PlanCard({ plan, copy }) {
  const accent = { Beta: "#7c3aed", Premium: "#d97706" }[plan.subscriptionTier] ?? "#2563eb";
  return (
    <BlurPanel as="article" className={plan.isPopular ? "products-page__card products-page__card--featured" : "products-page__card"}>
      <div className="products-page__card-inner">
        <div className="products-page__visual" style={{ "--product-accent": accent }}>
          <div className="products-page__visual-stage">
            <div className="products-page__visual-core" />
            <div className="products-page__visual-lines" />
          </div>
          <div className="products-page__tag">{plan.subscriptionTier}</div>
        </div>
        <div className="products-page__copy">
          <h2 className="products-page__card-title">{plan.name}</h2>
          <p className="products-page__card-description">{plan.description}</p>
          <div className="products-page__plan-meta">
            <span className="glass-chip products-page__plan-price">
              {plan.price} {plan.currency}
            </span>
            <span className="glass-chip products-page__plan-duration">{formatPlanDuration(plan.durationDays, copy)}</span>
            {plan.isPopular && <span className="glass-chip products-page__plan-popular">{copy.popular}</span>}
          </div>
        </div>
        <ActionButton to={"/products/purchase/" + plan.id} variant="primary" className="products-page__action">
          {copy.continue}
        </ActionButton>
      </div>
    </BlurPanel>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const copy = PRODUCTS_COPY[locale];
  const { pushNotice } = useNotice();
  const [plans, setPlans] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiPaymentPlans()
      .then((data) => {
        if (!cancelled) {
          setPlans(data);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = errorMessage(err, copy.unavailableFallback);
          setLoadError(message);
          pushNotice({
            tone: "error",
            title: copy.unavailableTitle,
            message
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [copy.unavailableFallback, copy.unavailableTitle, pushNotice]);

  return (
    <section className="route-page products-page">
      <div className="route-page__stack">
        <Reveal delay={0}>
          <RouteIntro badgeLabel={copy.badge} badgeIcon={<ProductsBadgeIcon />} title={copy.title} description={copy.description} />
        </Reveal>
        <Reveal delay={60}>
          <div className="route-rule" />
        </Reveal>
        <Reveal as="div" className="products-page__status" delay={90}>
          <span className="glass-chip">{copy.signedInAs(user?.displayName ?? copy.defaultUser)}</span>
          {loadError ? <p className="page-note">{loadError}</p> : null}
        </Reveal>
        <div className="products-page__grid">
          {plans.map((plan, index) => (
            <Reveal delay={120 + index * 45} key={plan.id}>
              <PlanCard plan={plan} copy={copy} />
            </Reveal>
          ))}
          {plans.length === 0 && !loadError && (
            <Reveal delay={120}>
              <p className="page-note">{copy.empty}</p>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
