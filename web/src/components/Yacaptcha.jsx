import { useEffect, useRef, useState } from "react";
import { isYacaptchaHostAllowed, yacaptchaChallenge, yacaptchaSolve, YacaptchaError } from "../lib/yacaptcha.js";

const VIRTUKID_TG = "https://t.me/virtukid";

/**
 * Turnstile-like checkbox captcha branded as Yacaptcha.
 */
export default function Yacaptcha({ onToken, onError, locale = "ru" }) {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | verifying | success | error
  const [error, setError] = useState("");
  const challengeIdRef = useRef("");
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  const copy =
    locale === "ru"
      ? {
          label: "Подтвердите, что вы человек",
          success: "Успешно",
          brand: "Yacaptcha",
          protectedBy: "protected by virtukid"
        }
      : {
          label: "Verify you are human",
          success: "Success",
          brand: "Yacaptcha",
          protectedBy: "protected by virtukid"
        };

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!isYacaptchaHostAllowed()) {
        setStatus("error");
        setError("Eyeglass error");
        onErrorRef.current?.("Eyeglass error");
        return;
      }
      setStatus("loading");
      try {
        const ch = await yacaptchaChallenge();
        if (cancelled) return;
        challengeIdRef.current = ch.challengeId;
        setStatus("ready");
        setError("");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof YacaptchaError ? err.message : "Eyeglass error";
        setStatus("error");
        setError(msg);
        onErrorRef.current?.(msg);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCheck() {
    if (status !== "ready" || !challengeIdRef.current) return;
    setStatus("verifying");
    try {
      const token = await yacaptchaSolve(challengeIdRef.current);
      setStatus("success");
      setError("");
      onTokenRef.current?.(token);
    } catch (err) {
      const msg = err instanceof YacaptchaError ? err.message : "Eyeglass error";
      setStatus("error");
      setError(msg);
      onTokenRef.current?.("");
      onErrorRef.current?.(msg);
    }
  }

  if (status === "error") {
    const isEyeglass = error === "Eyeglass error";
    return (
      <div className={"yacaptcha" + (isEyeglass ? " yacaptcha--eyeglass" : "")} role="alert">
        {isEyeglass ? (
          <>
            <div className="yacaptcha__eyeglass-icon" aria-hidden="true">
              <svg viewBox="0 0 64 32" width="48" height="24" fill="none">
                <circle cx="18" cy="16" r="10" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="46" cy="16" r="10" stroke="currentColor" strokeWidth="2.5" />
                <path d="M28 16H36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M8 16H4M60 16H56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="yacaptcha__eyeglass-text">Eyeglass error</div>
            <div className="yacaptcha__brand">Yacaptcha</div>
          </>
        ) : (
          <div className="yacaptcha__row">
            <div className="yacaptcha__label">
              <span>{error || "Yacaptcha error"}</span>
            </div>
            <div className="yacaptcha__meta">
              <div className="yacaptcha__brand">{copy.brand}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={"yacaptcha" + (status === "success" ? " yacaptcha--success" : "")}>
      <div className="yacaptcha__row">
        <button
          type="button"
          className={
            "yacaptcha__box" +
            (status === "success" ? " yacaptcha__box--checked" : "") +
            (status === "verifying" || status === "loading" ? " yacaptcha__box--spin" : "")
          }
          onClick={onCheck}
          disabled={status !== "ready"}
          aria-label={copy.label}
        >
          {status === "success" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : status === "verifying" || status === "loading" ? (
            <span className="yacaptcha__spinner" aria-hidden="true" />
          ) : null}
        </button>
        <div className="yacaptcha__label">
          <span>{status === "success" ? copy.success : copy.label}</span>
          {error && error !== "Eyeglass error" ? <small className="yacaptcha__err">{error}</small> : null}
        </div>
        <div className="yacaptcha__meta">
          <div className="yacaptcha__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 2L4 6v5c0 5.2 3.4 9.8 8 11 4.6-1.2 8-5.8 8-11V6l-8-4Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="yacaptcha__brand">{copy.brand}</div>
          <a className="yacaptcha__links" href={VIRTUKID_TG} target="_blank" rel="noreferrer">
            {copy.protectedBy}
          </a>
        </div>
      </div>
    </div>
  );
}
