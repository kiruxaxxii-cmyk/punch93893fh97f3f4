import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { apiCreatePayment, apiPaymentPlans, errorMessage } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, BlurPanel, Reveal } from "../components/shared.jsx";
import { PURCHASE_COPY, findPlanBySlug, formatPurchaseDuration, planTierColor } from "./products/copy.js";

export default function PurchasePage() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const copy = PURCHASE_COPY[locale];
  const { pushNotice } = useNotice();
  const { slug } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  const [notFound, setNotFound] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    apiPaymentPlans()
      .then((plans) => {
        if (cancelled) {
          return;
        }
        const found = findPlanBySlug(plans, slug);
        if (!found) {
          setPlan(null);
          setNotFound(true);
          return;
        }
        setPlan(found);
      })
      .catch((err) => {
        if (!cancelled) {
          setPlan(null);
          setNotFound(true);
          pushNotice({
            tone: "error",
            title: copy.unavailableTitle,
            message: errorMessage(err, copy.unavailableFallback)
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [copy.unavailableFallback, copy.unavailableTitle, pushNotice, slug]);

  const handleBuy = () => {
    if (!plan || !user) {
      return;
    }
    setRedirecting(true);
    apiCreatePayment(plan.id, promoCode)
      .then((url) => {
        window.location.href = url;
      })
      .catch((err) => {
        setRedirecting(false);
        pushNotice({
          tone: "error",
          title: copy.paymentErrorTitle,
          message: errorMessage(err, copy.paymentErrorFallback)
        });
      });
  };

  if (!loading && (notFound || !plan)) {
    return <Navigate to="/products" replace />;
  }
  if (!plan) {
    return null;
  }

  return (
    <section className="route-page purchase-page">
      <div className="purchase-page__layout">
        <BlurPanel as="article" className="purchase-page__visual-card" delay={0}>
          <div className="purchase-page__visual" style={{ "--product-accent": planTierColor(plan) }}>
            <div className="purchase-page__visual-core" />
            <div className="purchase-page__visual-lines" />
            <div className="purchase-page__tag">{plan.subscriptionTier}</div>
          </div>
        </BlurPanel>
        <Reveal as="article" className="purchase-page__details" delay={90}>
          <h1 className="purchase-page__title">{plan.name}</h1>
          <div className="route-rule" />
          <p className="purchase-page__description">{plan.description}</p>
          <div className="route-rule" />
          <div className="purchase-page__benefits">
            <h2 className="purchase-page__benefits-title">{copy.paymentDetails}</h2>
            <div className="purchase-page__chips">
              <span className="glass-chip">
                {plan.price} {plan.currency}
              </span>
              <span className="glass-chip">{formatPurchaseDuration(plan.durationDays, copy)}</span>
              <span className="glass-chip">
                {copy.planId}: {plan.id}
              </span>
            </div>
          </div>
          <div className="purchase-page__benefits">
            <h2 className="purchase-page__benefits-title">{copy.promoTitle}</h2>
            <input
              className="glass-input"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder={copy.promoPlaceholder}
              maxLength={64}
            />
          </div>
          <div className="purchase-page__actions">
            <ActionButton type="button" variant="primary" className="purchase-page__primary-action" onClick={handleBuy} disabled={redirecting}>
              {redirecting ? copy.redirecting : copy.buy}
            </ActionButton>
            <ActionButton to="/products" variant="secondary" className="purchase-page__secondary-action">
              {copy.back}
            </ActionButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
