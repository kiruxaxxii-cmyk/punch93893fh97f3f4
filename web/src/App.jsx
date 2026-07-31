import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { theme } from "./lib/theme.js";
import { LanguageProvider } from "./lib/lang.jsx";
import { NoticeProvider } from "./lib/notice.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import AppShell from "./components/AppShell.jsx";
import ProtectedLayout from "./components/ProtectedLayout.jsx";
import Home from "./pages/Home.jsx";
import Contacts from "./pages/Contacts.jsx";
import Agreement from "./pages/Agreement.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Profile from "./pages/Profile.jsx";
import Products from "./pages/Products.jsx";
import Purchase from "./pages/Purchase.jsx";
import Admin from "./pages/Admin.jsx";
import SupportDesk from "./pages/SupportDesk.jsx";
import ClientShell from "./pages/ClientShell.jsx";

function SiteRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="user-agreement" element={<Agreement />} />
          <Route path="sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="sign-up" element={<AuthPage mode="sign-up" />} />
          <Route element={<ProtectedLayout />}>
            <Route path="profile" element={<Profile />} />
            <Route path="products" element={<Products />} />
            <Route path="products/purchase/:slug" element={<Purchase />} />
          </Route>
          <Route element={<ProtectedLayout requiredRole="Admin" />}>
            <Route path="admin" element={<Admin />} />
            <Route path="admin/:section" element={<Admin />} />
          </Route>
          <Route element={<ProtectedLayout requiredRole="Helper" />}>
            <Route path="support-desk" element={<SupportDesk />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={theme.appColorVars}>
        <LanguageProvider>
          <NoticeProvider>
            <Routes>
              <Route path="v3/client" element={<ClientShell />} />
              <Route path="*" element={<SiteRoutes />} />
            </Routes>
          </NoticeProvider>
        </LanguageProvider>
      </div>
    </BrowserRouter>
  );
}
