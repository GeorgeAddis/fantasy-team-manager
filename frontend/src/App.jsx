import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import ManageTeamsPage from './pages/ManageTeams/ManageTeamsPage'
import OverviewPage from './pages/Overview/OverviewPage'
import RankingsPage from './pages/Rankings/RankingsPage'
import SetupPage from './pages/Setup/SetupPage'
import UpdateTeamsPage from './pages/UpdateTeams/UpdateTeamsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="teams" element={<Navigate to="/manage-teams" replace />} />
        <Route path="manage-teams" element={<ManageTeamsPage />} />
        <Route path="update-teams" element={<UpdateTeamsPage />} />
        <Route path="rankings" element={<RankingsPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
