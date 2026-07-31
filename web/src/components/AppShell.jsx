import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { preloadRoute } from "../lib/api.js";
import { theme } from "../lib/theme.js";
import LightRays from "./LightRays.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import CircleLoader from "./CircleLoader.jsx";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search]);
  return null;
}

export default function AppShell() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    let active = true;
    const id = counter.current + 1;
    counter.current = id;
    const timer = window.setTimeout(() => {
      if (active && counter.current === id) setLoading(true);
    }, 120);
    preloadRoute(location.pathname).finally(() => {
      window.clearTimeout(timer);
      if (active && counter.current === id) setLoading(false);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <ScrollToTop />
      <div className="app-shell__background" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor={theme.raysColor}
          raysSpeed={1.2}
          lightSpread={5}
          rayLength={7}
          pulsating={false}
          fadeDistance={2.3}
          saturation={1}
          followMouse={true}
          mouseInfluence={0.05}
          noiseAmount={0.6}
          distortion={0}
          className="h-full w-full opacity-100"
        />
      </div>
      <Header />
      <main className="app-shell__main">
        <div className="app-shell__route" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <Footer />
      <LanguageSwitcher />
      <CircleLoader visible={loading} />
    </div>
  );
}
