import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BodyMapPage } from "./pages/BodyMapPage";
import { ConcernDetail } from "./pages/ConcernDetail";
import { DocumentFlow } from "./pages/DocumentFlow";
import { Journal } from "./pages/Journal";
import { Overview } from "./pages/Overview";
import { VisitPrep } from "./pages/VisitPrep";
import { AppStateProvider } from "./state/StoreProvider";

export function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="map" element={<BodyMapPage />} />
            <Route path="journal" element={<Journal />} />
            <Route path="visit" element={<VisitPrep />} />
            <Route path="concern/:concernId" element={<ConcernDetail />} />
            <Route path="document" element={<DocumentFlow />} />
            <Route path="*" element={<Overview />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  );
}
