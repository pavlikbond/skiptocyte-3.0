import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ContactPage } from "@/pages/ContactPage";
import { CounterPage } from "@/pages/CounterPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SignupPage } from "@/pages/SignupPage";
import { TimersPage } from "@/pages/TimersPage";
import { ToolsPage } from "@/pages/ToolsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "differential", element: <CounterPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "timers", element: <TimersPage /> },
      { path: "tools", element: <ToolsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
