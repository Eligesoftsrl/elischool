import ResetPassword from "@/pages/ResetPassword";
// Reuse the same UI; backend endpoint /auth/setup-password is functionally identical to reset.
// But the page is mounted at /setup-password/:token route, so we proxy via reset.
export default function SetupPassword() {
  return <ResetPassword />;
}
