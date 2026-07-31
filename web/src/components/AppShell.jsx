import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { preloadRoute } from "../lib/api.js";
import { useSiteTheme } from "../lib/siteTheme.jsx";
import LightRays from "./LightRays.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";
import CircleLoader from "./CircleLoader.jsx";
import SmoothScroll from "./SmoothScroll.jsx";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const main = document.querySelector(".app-shell__main");
    if (main && main.scrollHeight > main.clientHeight + 1) main.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search]);
  return null;
}

export default function AppShell() {
  const location = useLocation();
  const { theme } = useSiteTheme();
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
      <SmoothScroll />
      <ScrollToTop />
      <div className="app-shell__background" aria-hidden="true">
        <LightRays
          raysColor={theme.raysColor}
          raysSpeed={1.05}
          lightSpread={5.8}
          rayLength={7.6}
          pulsating={false}
          fadeDistance={2.5}
          saturation={1.15}
          followMouse={true}
          mouseInfluence={0.07}
          noiseAmount={0.35}
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
      <ThemeSwitcher />
      <CircleLoader visible={loading} />
    </div>
  );
}
