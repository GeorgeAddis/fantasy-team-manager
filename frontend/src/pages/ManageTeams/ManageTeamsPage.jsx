import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import FlagIcon from '@mui/icons-material/Flag'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import { useLeagueList, useFlagWaiverClaims, useUpdateLeague } from '@/hooks/useLeagues'
import { useTeamLineupAnalysis } from '@/hooks/useTeams'
import TeamsTable from './TeamsTable'
import ConfirmDialog from '@/components/ConfirmDialog'
import SeasonRankingsColumn from './SeasonRankingsColumn'
import WeekRankingsColumn from './WeekRankingsColumn'
import TopWaiverColumn from './TopWaiverColumn'

const FILTERS = [
  { value: 'all', label: 'All Teams', icon: GroupsIcon },
  { value: 'require-lineup-change', label: 'Require Lineup Change', icon: SyncAltIcon },
  { value: 'require-waiver-claims', label: 'Require Waiver Claims', icon: SyncAltIcon },
]

export default function ManageTeamsPage() {
  const [filter, setFilter] = useState('all')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [claimsTarget, setClaimsTarget] = useState(null)
  const { data: leagueData, isLoading: leaguesLoading } = useLeagueList()
  const { data: analysisData, isLoading: analysisLoading } = useTeamLineupAnalysis()
  const flagMutation = useFlagWaiverClaims()
  const updateLeagueMutation = useUpdateLeague()

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
      return rows.filter((r) => r.league.requires_waiver_claim === true)
    }
    return rows
  }, [rows, filter])

  function handleFilterChange(_, next) {
    if (!next) return
    setClaimsTarget(null)
    setFilter(next)
  }

  function handleFlagConfirm() {
    flagMutation.mutate(undefined, {
      onSuccess: () => setConfirmOpen(false),
    })
  }

  function handleMakeClaims({ league, myTeam }) {
    setClaimsTarget({ league, myTeam })
  }

  function handleBack() {
    setClaimsTarget(null)
  }

  function handleCompleteClaims() {
    updateLeagueMutation.mutate(
      { id: claimsTarget.league.id, requires_waiver_claim: false },
      { onSuccess: () => setClaimsTarget(null) },
    )
  }

  const isWaiverView = filter === 'require-waiver-claims'
  const showMakeClaims = isWaiverView && claimsTarget !== null

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
        {showMakeClaims ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
                Make Claims — {claimsTarget.league.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                  sx={{ textTransform: 'none' }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={handleCompleteClaims}
                  disabled={updateLeagueMutation.isPending}
                  sx={{ textTransform: 'none' }}
                >
                  Complete Claims
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 3 }}>
              <SeasonRankingsColumn leagueId={claimsTarget.league.id} teamId={claimsTarget.myTeam.id} />
              <Box sx={{ width: '1px', bgcolor: 'divider' }} />
              <WeekRankingsColumn leagueId={claimsTarget.league.id} teamId={claimsTarget.myTeam.id} />
              <Box sx={{ width: '1px', bgcolor: 'divider' }} />
              <TopWaiverColumn />
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
                {FILTERS.find((f) => f.value === filter)?.label}
              </Typography>

              {isWaiverView && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FlagIcon />}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Flag All Leagues
                </Button>
              )}
            </Box>

            <TeamsTable
              rows={filteredRows}
              isLoading={isLoading}
              variant={filter}
              onMakeClaims={handleMakeClaims}
            />
          </>
        )}
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title="Flag All Leagues"
        message="Are you sure you want to flag all leagues as requiring waiver claims? This will mark every league so it appears in this list."
        confirmLabel="Flag All"
        confirmColor="primary"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleFlagConfirm}
        isLoading={flagMutation.isPending}
      />

    </Box>
  )
}
