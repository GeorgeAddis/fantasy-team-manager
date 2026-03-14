import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import ManageTeamsPage from './pages/ManageTeams/ManageTeamsPage'
import OverviewPage from './pages/Overview/OverviewPage'
import RankingsPage from './pages/Rankings/RankingsPage'
import SetupPage from './pages/Setup/SetupPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="teams" element={<ManageTeamsPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
