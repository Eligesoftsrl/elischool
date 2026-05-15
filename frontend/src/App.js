import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SetupPassword from "@/pages/SetupPassword";
import Landing from "@/pages/Landing";

import StaffLayout from "@/layouts/StaffLayout";
import StaffDashboard from "@/pages/staff/Dashboard";
import StaffStudents from "@/pages/staff/Students";
import StaffClassrooms from "@/pages/staff/Classrooms";
import StaffTeachers from "@/pages/staff/Teachers";
import StaffParents from "@/pages/staff/Parents";
import StaffActivities from "@/pages/staff/Activities";
import StaffMenu from "@/pages/staff/Menu";
import StaffNews from "@/pages/staff/News";
import StaffYears from "@/pages/staff/Years";
import StaffYearTransition from "@/pages/staff/YearTransition";

import ParentLayout from "@/layouts/ParentLayout";
import ParentHome from "@/pages/parent/Home";
import ParentTimeline from "@/pages/parent/Timeline";
import ParentMenuPage from "@/pages/parent/Menu";
import ParentNews from "@/pages/parent/News";

function Protected({ roles, children }) {
  const { user, bootDone } = useAuth();
  if (!bootDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg-base]">
        <div className="h-3 w-3 rounded-full bg-brand pulse-dot" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "parent") return <Navigate to="/g" replace />;
    return <Navigate to="/s" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, bootDone } = useAuth();
  if (!bootDone) return null;
  if (!user) return <Landing />;
  if (user.role === "parent") return <Navigate to="/g" replace />;
  return <Navigate to="/s" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: "16px", fontFamily: "Manrope, sans-serif" },
          }}
        />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/setup-password/:token" element={<SetupPassword />} />

          {/* STAFF */}
          <Route
            path="/s"
            element={
              <Protected roles={["admin", "teacher"]}>
                <StaffLayout />
              </Protected>
            }
          >
            <Route index element={<StaffDashboard />} />
            <Route path="alunni" element={<StaffStudents />} />
            <Route path="sezioni" element={<StaffClassrooms />} />
            <Route path="maestre" element={<StaffTeachers />} />
            <Route path="genitori" element={<StaffParents />} />
            <Route path="attivita" element={<StaffActivities />} />
            <Route path="menu" element={<StaffMenu />} />
            <Route path="news" element={<StaffNews />} />
            <Route path="anni" element={<StaffYears />} />
            <Route path="passaggio-anno" element={<StaffYearTransition />} />
          </Route>

          {/* PARENT */}
          <Route
            path="/g"
            element={
              <Protected roles={["parent"]}>
                <ParentLayout />
              </Protected>
            }
          >
            <Route index element={<ParentHome />} />
            <Route path="timeline" element={<ParentTimeline />} />
            <Route path="menu" element={<ParentMenuPage />} />
            <Route path="news" element={<ParentNews />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
