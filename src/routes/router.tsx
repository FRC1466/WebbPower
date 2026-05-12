import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import LiveRoute from "@/routes/live";
import BatteriesRoute from "@/routes/batteries";
import MatchesRoute from "@/routes/matches";
import MatchDetailRoute from "@/routes/match-detail";
import AnalyticsRoute from "@/routes/analytics";
import AlertsRoute from "@/routes/alerts";
import SetupRoute from "@/routes/setup";
import SubsystemsRoute from "@/routes/subsystems";
import ImportRoute from "@/routes/import";
import SignInRoute from "@/routes/signin";

export const router = createBrowserRouter([
  {
    path: "/signin",
    Component: SignInRoute,
  },
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: LiveRoute },
      { path: "batteries", Component: BatteriesRoute },
      { path: "matches", Component: MatchesRoute },
      { path: "matches/:sessionId", Component: MatchDetailRoute },
      { path: "import", Component: ImportRoute },
      { path: "analytics", Component: AnalyticsRoute },
      { path: "alerts", Component: AlertsRoute },
      { path: "setup", Component: SetupRoute },
      { path: "subsystems", Component: SubsystemsRoute },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
