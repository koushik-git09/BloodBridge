import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import RoleSelectorPage from "./pages/RoleSelectorPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import HospitalDashboard from "./pages/HospitalDashboard";
import BloodBankDashboard from "./pages/BloodBankDashboard";
import DonorDashboard from "./pages/DonorDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/roles"
          element={<RoleSelectorPage />}
        />


        {/* ================= AUTH ROUTES ================= */}

        <Route
          path="/login"
          element={<RoleSelectorPage />}
        />

        <Route
          path="/login/:role"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RoleSelectorPage />}
        />

        <Route
          path="/register/:role"
          element={<RegisterPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/forgot-password/:role"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />



        {/* ================= PROTECTED DASHBOARDS ================= */}

        <Route
          path="/dashboard/hospital"
          element={
            <ProtectedRoute allowedRole="HOSPITAL">
              <HospitalDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/blood-bank"
          element={
            <ProtectedRoute allowedRole="BLOOD_BANK">
              <BloodBankDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/donor"
          element={
            <ProtectedRoute allowedRole="DONOR">
              <DonorDashboard />
            </ProtectedRoute>
          }
        />


        {/* ================= FALLBACK ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}