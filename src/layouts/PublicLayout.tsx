import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReminderWidget from "@/components/ReminderWidget";
import EventBannerDisplay from "@/components/EventBannerDisplay";
import TelegramFloatingButton from "@/components/TelegramFloatingButton";
import { trackPageVisit } from "@/lib/api";
import { useSiteSettingsContext } from "@/contexts/SiteSettingsContext";
import { getLabel } from "@/lib/labels";

const PublicLayout = () => {
  const location = useLocation();
  const settings = useSiteSettingsContext();

  useEffect(() => {
    trackPageVisit(location.pathname);
  }, [location.pathname]);

  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EventBannerDisplay />
      <main className="flex-1">
        <Outlet />
      </main>
      <ReminderWidget />
      <TelegramFloatingButton />
      {isHome && <VisitorCounter />}
      {isHome ? (
        <Footer />
      ) : (
        <footer className="glass-nav mt-12 py-5">
          <div className="container text-center text-xs text-muted-foreground">
            © {settings.footerCopyrightYear || new Date().getFullYear()} {settings.brandName || "Target"} {settings.brandEmoji || "🎯"} — {settings.footerCopyrightText || getLabel("allRightsReserved")}
          </div>
        </footer>
      )}
    </div>
  );
};

export default PublicLayout;