import { Route, Routes } from "react-router-dom"
import { Shell } from "./components/Shell"
import { AnalysesPage } from "./pages/AnalysesPage"
import { EvaluationPage } from "./pages/EvaluationPage"
import { GuidePage } from "./pages/GuidePage"
import { WorkspacePage } from "./pages/WorkspacePage"
import { ServiceProvider } from "./state/ServiceContext"
import { WorkspaceProvider } from "./state/WorkspaceContext"

export default function App() {
  return (
    <ServiceProvider>
      <WorkspaceProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<WorkspacePage />} />
            <Route path="analyses" element={<AnalysesPage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="guide" element={<GuidePage />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </ServiceProvider>
  )
}
