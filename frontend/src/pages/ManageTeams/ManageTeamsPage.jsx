import { useMemo, useState } from 'react'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import SyncAltIcon from '@mui/icons-material/SyncAlt'

import { useLeagueList } from '@/hooks/useLeagues'
import { useTeamLineupAnalysis } from '@/hooks/useTeams'
import TeamsTable from './TeamsTable'

const FILTERS = [
  { value: 'all', label: 'All Teams', icon: GroupsIcon },
  { value: 'require-lineup-change', label: 'Require Lineup Change', icon: SyncAltIcon },
  { value: 'require-waiver-claims', label: 'Require Waiver Claims', icon: SyncAltIcon },
]

export default function ManageTeamsPage() {
  const [filter, setFilter] = useState('all')
  const { data: leagueData, isLoading: leaguesLoading } = useLeagueList()
  const { data: analysisData, isLoading: analysisLoading } = useTeamLineupAnalysis()

  const isLoading = leaguesLoading || analysisLoading

  const rows = useMemo(() => {
    const leagues = leagueData?.data ?? []
    const analysisList = analysisData?.data ?? []

    // Build lookup: team_id → analysis entry
    const analysisMap = {}
    for (const entry of analysisList) {
      analysisMap[entry.id] = entry
    }

    // One row per league that has a "my team"
    return leagues
      .map((league) => {
        const myTeam = league.teams?.find((t) => t.my_team) ?? null
        if (!myTeam) return null
        return { league, myTeam, analysis: analysisMap[myTeam.id] ?? null }
      })
      .filter(Boolean)
  }, [leagueData, analysisData])

  const filteredRows = useMemo(() => {
    if (filter === 'require-lineup-change') {
      return rows.filter((r) => r.analysis?.requires_lineup_change === true)
    }
    if (filter === 'require-waiver-claims') {
      return []
    }
    return rows
  }, [rows, filter])

  function handleFilterChange(_, next) {
    if (!next) return
    setFilter(next)
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '100%', overflow: 'hidden' }}>

      {/* ──── Sidebar ──── */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          overflowY: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" color="secondary.main" sx={{ mb: 0.5 }}>
            Manage Teams
          </Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={handleFilterChange}
            orientation="vertical"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                justifyContent: 'flex-start',
                px: 2,
                '&.Mui-selected': {
                  bgcolor: 'rgba(212,165,116,0.15)',
                  color: 'secondary.main',
                  borderColor: 'secondary.main',
                },
              },
            }}
          >
            {FILTERS.map(({ value, label, icon: Icon }) => (
              <ToggleButton key={value} value={value}>
                <Icon sx={{ mr: 1, fontSize: 18 }} />
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ──── Main content ──── */}
      <Box sx={{ flex: 1, minWidth: 0, p: 3, overflowY: 'auto' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
          {FILTERS.find((f) => f.value === filter)?.label}
        </Typography>

        {filter === 'require-waiver-claims' ? (
          <Typography color="text.secondary" paragraph>
            Sample waiver-claims workflow content will live here. This section
            can show leagues/teams that need waiver actions and recommended
            claim priorities. Page-specific Manage Teams code lives in{' '}
            <code>src/pages/ManageTeams/</code>.
          </Typography>
        ) : (
          <TeamsTable rows={filteredRows} isLoading={isLoading} variant={filter} />
        )}
      </Box>

    </Box>
  )
}
