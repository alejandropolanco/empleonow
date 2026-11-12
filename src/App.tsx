import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SplashScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen } from "@/screens/auth/AuthScreens";
import DesktopCandidate from "@/screens/candidate/DesktopCandidate";
import CompleteProfile from "@/screens/candidate/CompleteProfile";
import CompanyRegister from "@/screens/company/CompanyRegister";
import CompanyDesktop from "@/screens/company/CompanyDesktop";
import AdminPlaceholder from "@/screens/admin/AdminPlaceholder";
import { AuthProvider, RequireRole, PublicOnly } from "@/lib/auth";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicOnly><SplashScreen /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><LoginScreen /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterScreen /></PublicOnly>} />
          <Route path="/register/company" element={<PublicOnly><CompanyRegister /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordScreen /></PublicOnly>} />

          <Route
            path="/candidate/complete-profile"
            element={<RequireRole roles={["postulante"]}><CompleteProfile /></RequireRole>}
          />
          <Route
            path="/candidate/desktop"
            element={<RequireRole roles={["postulante"]}><DesktopCandidate /></RequireRole>}
          />

          <Route
            path="/company/desktop"
            element={<RequireRole roles={["empresa"]}><CompanyDesktop /></RequireRole>}
          />

          <Route path="/admin" element={<RequireRole roles={["admin"]}><AdminPlaceholder /></RequireRole>} />

          {/* Rutas antiguas: un solo layout responsive. */}
          <Route path="/candidate/mobile" element={<Navigate to="/candidate/desktop" replace />} />
          <Route path="/company/mobile" element={<Navigate to="/company/desktop" replace />} />
          <Route path="/company/register" element={<Navigate to="/register/company" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
