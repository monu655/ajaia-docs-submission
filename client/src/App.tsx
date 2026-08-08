import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import { useUserStore } from "./store/userStore";

export default function App() {
  const currentUser = useUserStore((s) => s.currentUser);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/documents" element={<DashboardPage />} />
        <Route path="/documents/:id" element={<EditorPage />} />
        <Route
          path="/"
          element={<Navigate to={currentUser ? "/documents" : "/login"} replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
