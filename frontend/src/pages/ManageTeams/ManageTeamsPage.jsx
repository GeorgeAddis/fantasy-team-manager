import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import GroupsIcon from '@mui/icons-material/Groups'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import FlagIcon from '@mui/icons-material/Flag'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import TuneIcon from '@mui/icons-material/Tune'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

import PersonAddIcon from '@mui/icons-material/PersonAdd'
import BlockIcon from '@mui/icons-material/Block'
import ErrorIcon from '@mui/icons-material/Error'
import { useLeagueList, useFlagWaiverClaims, useFlagRosterMoves, useFlagRosterOptimisation, useFlagThursdayUpdate, useUpdateLeague } from '@/hooks/useLeagues'
import { useTeamLineupAnalysis, useTeamRosterAddAnalysis, useTeamRoster } from '@/hooks/useTeams'
import { useSettings } from '@/hooks/useSettings'
import TeamsTable from './TeamsTable'
import ConfirmDialog from '@/components/ConfirmDialog'
import SeasonRankingsColumn from './SeasonRankingsColumn'
import WeekRankingsColumn from './WeekRankingsColumn'
import TopWaiverColumn from './TopWaiverColumn'
import SeasonRankingsExpanded from './SeasonRankingsExpanded'
import HomePanel from './HomePanel'
import SearchRosterPanel from './SearchRosterPanel'
import DoNotRosterPanel from './DoNotRosterPanel'

const POSITION_COLORS = {
  QB: '#e57373',
  RB1: '#64b5f6',
  RB2: '#64b5f6',
  WR1: '#81c784',
  WR2: '#81c784',
  WR3: '#81c784',
  TE: '#ffb74d',
  FLEX: '#ce93d8',
  K: '#a1887f',
  DST: '#90a4ae',
}

const FILTERS = [
  { value: 'home', label: 'Home', icon: HomeIcon },
  { value: 'all', label: 'All Teams', icon: GroupsIcon },
  { value: 'require-lineup-change', label: 'Require Lineup Change', icon: SyncAltIcon },
  { value: 'require-roster-moves', label: 'Require Roster Moves', icon: PersonAddIcon },
  { value: 'roster-optimisation', label: 'Roster Optimisation', icon: TuneIcon },
  { value: 'thursday-update', label: 'Thursday Team Updates', icon: CalendarTodayIcon },
  { value: 'require-waiver-claims', label: 'Require Waiver Claims', icon: SyncAltIcon },
  { value: 'do-not-roster', label: 'Do Not Roster', icon: BlockIcon },
  { value: 'search-player', label: 'Search for Player', icon: PersonSearchIcon },
  { value: 'search-franchise', label: 'Search for Franchise', icon: PersonSearchIcon },
]

export default function ManageTeamsPage() {
  const [filter, setFilter] = useState('home')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRosterMovesOpen, setConfirmRosterMovesOpen] = useState(false)
  const [confirmRosterOptOpen, setConfirmRosterOptOpen] = useState(false)
  const [claimsTarget, setClaimsTarget] = useState(null)
  const [addsTarget, setAddsTarget] = useState(null)
  const [optimiseTarget, setOptimiseTarget] = useState(null)
  const [thursdayTarget, setThursdayTarget] = useState(null)
  const [confirmThursdayOpen, setConfirmThursdayOpen] = useState(false)
  const { data: leagueData, isLoading: leaguesLoading } = useLeagueList()
  const { data: analysisData, isLoading: analysisLoading } = useTeamLineupAnalysis()
  const { data: rosterAddData, isLoading: rosterAddLoading } = useTeamRosterAddAnalysis()
  const { data: settingsData } = useSettings()
  const flagMutation = useFlagWaiverClaims()
  const flagRosterMovesMutation = useFlagRosterMoves()
  const flagRosterOptMutation = useFlagRosterOptimisation()
  const flagThursdayMutation = useFlagThursdayUpdate()
  const updateLeagueMutation = useUpdateLeague()
  const activeRosterId = addsTarget?.myTeam?.id ?? optimiseTarget?.myTeam?.id ?? (thursdayTarget?.step >= 1 ? thursdayTarget?.myTeam?.id : null)
  const { data: rosterPanelData, isLoading: rosterPanelLoading } = useTeamRoster(
    activeRosterId,
    { enabled: activeRosterId != null },
  )

  const currentWeek = parseInt(settingsData?.data?.current_week ?? '0', 10)

  const isLoading = leaguesLoading || analysisLoading || rosterAddLoading

  const rows = useMemo(() => {
    const leagues = leagueData?.data ?? []
    const analysisList = analysisData?.data ?? []
    const rosterAddList = rosterAddData?.data ?? []

    // Build lookup: team_id → analysis entry
    const analysisMap = {}
    for (const entry of analysisList) {
      analysisMap[entry.id] = entry
    }

    // Build lookup: team_id → roster add analysis entry
    const rosterAddMap = {}
    for (const entry of rosterAddList) {
      rosterAddMap[entry.id] = entry
    }

    // One row per league that has a "my team"
    return leagues
      .map((league) => {
        const myTeam = league.teams?.find((t) => t.my_team) ?? null
        if (!myTeam) return null
        return {
          league,
          myTeam,
          analysis: analysisMap[myTeam.id] ?? null,
          rosterAdd: rosterAddMap[myTeam.id] ?? null,
        }
      })
      .filter(Boolean)
  }, [leagueData, analysisData, rosterAddData])

  const filteredRows = useMemo(() => {
    if (filter === 'require-lineup-change') {
      return rows.filter((r) => r.analysis?.requires_lineup_change === true)
    }
    if (filter === 'require-roster-moves') {
      return rows.filter((r) => r.league.requires_roster_moves === true && r.rosterAdd?.requires_roster_moves === true)
    }
    if (filter === 'require-waiver-claims') {
      return rows.filter((r) => r.league.requires_waiver_claim === true)
    }
    if (filter === 'roster-optimisation') {
      return rows.filter((r) => r.league.requires_roster_optimised === true)
    }
    if (filter === 'thursday-update') {
      return rows.filter((r) => r.league.requires_thursday_update === true)
    }
    if (filter === 'home' || filter === 'search-player' || filter === 'search-franchise' || filter === 'do-not-roster') return []
    return rows
  }, [rows, filter])

  function handleFilterChange(_, next) {
    if (!next) return
    setClaimsTarget(null)
    setAddsTarget(null)
    setOptimiseTarget(null)
    setThursdayTarget(null)
    setFilter(next)
  }

  function handleFlagConfirm() {
    flagMutation.mutate(undefined, {
      onSuccess: () => setConfirmOpen(false),
    })
  }

  function handleFlagRosterMovesConfirm() {
    flagRosterMovesMutation.mutate(undefined, {
      onSuccess: () => setConfirmRosterMovesOpen(false),
    })
  }

  function handleFlagRosterOptConfirm() {
    flagRosterOptMutation.mutate(undefined, {
      onSuccess: () => setConfirmRosterOptOpen(false),
    })
  }

  function handleMakeClaims({ league, myTeam }) {
    setClaimsTarget({ league, myTeam })
  }

  function handleMakeAdds({ league, myTeam, rosterAdd }) {
    setAddsTarget({ league, myTeam, suggestedAdds: rosterAdd?.suggested_adds ?? [] })
  }

  function handleOptimise({ league, myTeam }) {
    setOptimiseTarget({ league, myTeam })
  }

  function handleBack() {
    setClaimsTarget(null)
  }

  function handleAddsBack() {
    setAddsTarget(null)
  }

  function handleOptimiseBack() {
    setOptimiseTarget(null)
  }

  function handleCompleteClaims() {
    updateLeagueMutation.mutate(
      { id: claimsTarget.league.id, requires_waiver_claim: false },
      { onSuccess: () => setClaimsTarget(null) },
    )
  }

  function handleCompleteAdds() {
    updateLeagueMutation.mutate(
      { id: addsTarget.league.id, requires_roster_moves: false },
      { onSuccess: () => setAddsTarget(null) },
    )
  }

  function handleCompleteOptimise() {
    updateLeagueMutation.mutate(
      { id: optimiseTarget.league.id, requires_roster_optimised: false },
      { onSuccess: () => setOptimiseTarget(null) },
    )
  }

  function handleThursdayUpdate({ league, myTeam, analysis, rosterAdd }) {
    setThursdayTarget({ league, myTeam, analysis, rosterAdd, step: 0 })
  }

  function handleThursdayBack() {
    if (thursdayTarget.step > 0) {
      setThursdayTarget((t) => ({ ...t, step: t.step - 1 }))
    }
  }

  function handleThursdayForward() {
    if (thursdayTarget.step < 2) {
      setThursdayTarget((t) => ({ ...t, step: t.step + 1 }))
    }
  }

  function handleCompleteThursdayUpdate() {
    updateLeagueMutation.mutate(
      {
        id: thursdayTarget.league.id,
        requires_roster_moves: false,
        requires_roster_optimised: false,
        requires_thursday_update: false,
      },
      { onSuccess: () => setThursdayTarget(null) },
    )
  }

  function handleFlagThursdayConfirm() {
    flagThursdayMutation.mutate(undefined, {
      onSuccess: () => setConfirmThursdayOpen(false),
    })
  }

  const isWaiverView = filter === 'require-waiver-claims'
  const isRosterMovesView = filter === 'require-roster-moves'
  const isRosterOptView = filter === 'roster-optimisation'
  const isThursdayView = filter === 'thursday-update'
  const showMakeClaims = isWaiverView && claimsTarget !== null
  const showMakeAdds = isRosterMovesView && addsTarget !== null
  const showOptimise = isRosterOptView && optimiseTarget !== null
  const showThursday = isThursdayView && thursdayTarget !== null

  const STARTER_POSITIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'RWT', 'K', 'DST']
  const SLOT_LABELS = { QB: 'QB', RB1: 'RB1', RB2: 'RB2', WR1: 'WR1', WR2: 'WR2', WR3: 'WR3', TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN' }

  function byeRowColor(byeWeek) {
    if (!byeWeek || !currentWeek) return undefined
    if (byeWeek === currentWeek) return 'rgba(211,47,47,0.15)'
    if (byeWeek === currentWeek + 1) return 'rgba(33,150,243,0.15)'
    return undefined
  }

  function posPrefix(pos) {
    return pos === 'DST' ? 'D' : pos
  }

  function formatPosRank(positions, rank) {
    if (rank == null || rank >= 999) return '—'
    return `${posPrefix(positions?.[0] ?? '')}${rank}`
  }

  function formatRank(rank) {
    if (rank == null || rank >= 999) return '—'
    return rank
  }

  function RosterRow({ slot }) {
    const player = slot.player
    const bgColor = player ? byeRowColor(player.bye_week) : undefined
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '52px 1fr 40px 55px 40px 55px 35px',
          gap: 0.5,
          px: 1.5,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          alignItems: 'center',
          bgcolor: bgColor ?? 'transparent',
        }}
      >
        <Chip
          label={SLOT_LABELS[slot.lineup_position] ?? slot.lineup_position}
          size="small"
          sx={{
            width: 48,
            height: 22,
            fontWeight: 700,
            fontSize: '0.65rem',
            bgcolor: POSITION_COLORS[slot.lineup_position] ?? '#616161',
            color: '#fff',
          }}
        />
        {player ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
              {player.do_not_roster && (
                <ErrorIcon sx={{ fontSize: 14, color: 'error.main', flexShrink: 0 }} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                {player.name}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
              {formatRank(player.season_rank)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
              {formatPosRank(player.positions, player.season_position_rank)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
              {formatRank(player.week_rank)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
              {formatPosRank(player.positions, player.week_position_rank)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
              {player.bye_week ?? '—'}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>Empty</Typography>
            <Typography variant="caption" />
            <Typography variant="caption" />
            <Typography variant="caption" />
            <Typography variant="caption" />
            <Typography variant="caption" />
          </>
        )}
      </Box>
    )
  }

  function renderRosterPanel() {
    const rosterSlots = rosterPanelData?.data ?? []
    const starters = rosterSlots.filter((s) => STARTER_POSITIONS.includes(s.lineup_position))
    const bench = rosterSlots.filter((s) => s.lineup_position === 'BN')

    return (
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Current Roster
        </Typography>
        {rosterPanelLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : rosterSlots.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            No roster data available.
          </Typography>
        ) : (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr 40px 55px 40px 55px 35px',
                gap: 0.5,
                px: 1.5,
                py: 0.75,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>Pos</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>Player</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>SZN</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>SPos</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>Wk</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>WPos</Typography>
              <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>Bye</Typography>
            </Box>

            {starters.map((slot, i) => (
              <RosterRow key={`s-${i}`} slot={slot} />
            ))}

            {bench.length > 0 && (
              <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1 }}>
                  BENCH
                </Typography>
              </Box>
            )}
            {bench.map((slot, i) => (
              <RosterRow key={`b-${i}`} slot={slot} />
            ))}
          </Box>
        )}
      </Box>
    )
  }

  function renderContent() {
    if (filter === 'home') {
      return <HomePanel />
    }

    if (filter === 'search-player') {
      return <SearchRosterPanel key="player" type="player" />
    }

    if (filter === 'search-franchise') {
      return <SearchRosterPanel key="franchise" type="franchise" />
    }

    if (filter === 'do-not-roster') {
      return <DoNotRosterPanel />
    }

    if (showOptimise) {
      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
              Optimise Roster — {optimiseTarget.league.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={handleOptimiseBack}
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={handleCompleteOptimise}
                disabled={updateLeagueMutation.isPending}
                sx={{ textTransform: 'none' }}
              >
                Optimise
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
            {/* Left: Rest of Season rankings */}
            <SeasonRankingsExpanded leagueId={optimiseTarget.league.id} teamId={optimiseTarget.myTeam.id} currentWeek={currentWeek} />

            {/* Divider */}
            <Box sx={{ width: '1px', bgcolor: 'divider' }} />

            {/* Right: Current Roster */}
            {renderRosterPanel()}
          </Box>
        </>
      )
    }

    if (showThursday) {
      const step = thursdayTarget.step
      const STEP_LABELS = ['Lineup Changes', 'Roster Moves', 'Roster Optimisation']
      const suggestedChanges = thursdayTarget.analysis?.suggested_changes ?? []
      const suggestedAdds = thursdayTarget.rosterAdd?.suggested_adds ?? []

      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
                Thursday Update — {thursdayTarget.league.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Step {step + 1} of 3: {STEP_LABELS[step]}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {step > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleThursdayBack}
                  sx={{ textTransform: 'none' }}
                >
                  Back
                </Button>
              )}
              {step < 2 ? (
                <Button
                  variant="contained"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleThursdayForward}
                  sx={{ textTransform: 'none' }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={handleCompleteThursdayUpdate}
                  disabled={updateLeagueMutation.isPending}
                  sx={{ textTransform: 'none' }}
                >
                  Complete Thursday Update
                </Button>
              )}
            </Box>
          </Box>

          {/* Step 0: Lineup Changes */}
          {step === 0 && (
            <>
              {suggestedChanges.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No lineup changes required — current starting lineup is optimal.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 500 }}>
                  {suggestedChanges.map((c, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      }}
                    >
                      <Chip
                        label={c.position}
                        size="small"
                        sx={{
                          width: 52,
                          height: 24,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          bgcolor: POSITION_COLORS[c.position] ?? '#616161',
                          color: '#fff',
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'error.light',
                          textDecoration: 'line-through',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.current_player ?? 'Empty'}
                      </Typography>
                      <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'success.light',
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.bench_player ?? 'Empty'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* Step 1: Roster Moves */}
          {step === 1 && (
            <>
              {suggestedAdds.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No roster moves required — no free agent upgrades available.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                      Suggested Adds
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {suggestedAdds.map((a, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.75,
                            px: 1,
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                          }}
                        >
                          <Chip
                            label={a.position}
                            size="small"
                            sx={{
                              width: 52,
                              height: 24,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              flexShrink: 0,
                              bgcolor: POSITION_COLORS[a.position] ?? '#616161',
                              color: '#fff',
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'error.light',
                              textDecoration: 'line-through',
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {a.current_player ?? 'Empty'}
                          </Typography>
                          {a.current_week_position_rank != null && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                              #{a.current_week_position_rank}
                            </Typography>
                          )}
                          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                          <Chip
                            label={a.source}
                            size="small"
                            sx={{
                              width: 32,
                              height: 22,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              flexShrink: 0,
                              bgcolor: a.source === 'FA' ? '#9c27b0' : '#90a4ae',
                              color: '#fff',
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'success.light',
                              fontWeight: 600,
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {a.player_name}
                          </Typography>
                          {a.player_week_position_rank != null && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                              #{a.player_week_position_rank}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ width: '1px', bgcolor: 'divider' }} />
                  {renderRosterPanel()}
                </Box>
              )}
            </>
          )}

          {/* Step 2: Roster Optimisation */}
          {step === 2 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
              <SeasonRankingsExpanded leagueId={thursdayTarget.league.id} teamId={thursdayTarget.myTeam.id} currentWeek={currentWeek} />
              <Box sx={{ width: '1px', bgcolor: 'divider' }} />
              {renderRosterPanel()}
            </Box>
          )}
        </>
      )
    }

    if (showMakeClaims) {
      return (
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
            <SeasonRankingsColumn leagueId={claimsTarget.league.id} teamId={claimsTarget.myTeam.id} currentWeek={currentWeek} />
            <Box sx={{ width: '1px', bgcolor: 'divider' }} />
            <WeekRankingsColumn leagueId={claimsTarget.league.id} teamId={claimsTarget.myTeam.id} currentWeek={currentWeek} />
            <Box sx={{ width: '1px', bgcolor: 'divider' }} />
            <TopWaiverColumn leagueId={claimsTarget.league.id} teamId={claimsTarget.myTeam.id} currentWeek={currentWeek} />
          </Box>
        </>
      )
    }

    if (showMakeAdds) {
      const adds = addsTarget.suggestedAdds

      return (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
              Make Adds — {addsTarget.league.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={handleAddsBack}
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={handleCompleteAdds}
                disabled={updateLeagueMutation.isPending}
                sx={{ textTransform: 'none' }}
              >
                Complete Adds
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
            {/* Left: Suggested Adds */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Suggested Adds
              </Typography>
              {(!adds || adds.length === 0) ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No changes — current lineup is optimal.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {adds.map((a, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      }}
                    >
                      <Chip
                        label={a.position}
                        size="small"
                        sx={{
                          width: 52,
                          height: 24,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          flexShrink: 0,
                          bgcolor: POSITION_COLORS[a.position] ?? '#616161',
                          color: '#fff',
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'error.light',
                          textDecoration: 'line-through',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {a.current_player ?? 'Empty'}
                      </Typography>
                      {a.current_week_position_rank != null && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                          #{a.current_week_position_rank}
                        </Typography>
                      )}
                      <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                      <Chip
                        label={a.source}
                        size="small"
                        sx={{
                          width: 32,
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          flexShrink: 0,
                          bgcolor: a.source === 'FA' ? '#9c27b0' : '#90a4ae',
                          color: '#fff',
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'success.light',
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {a.player_name}
                      </Typography>
                      {a.player_week_position_rank != null && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>
                          #{a.player_week_position_rank}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Divider */}
            <Box sx={{ width: '1px', bgcolor: 'divider' }} />

            {/* Right: Current Roster */}
            {renderRosterPanel()}
          </Box>
        </>
      )
    }

    return (
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
          {isRosterMovesView && (
            <Button
              variant="contained"
              size="small"
              startIcon={<FlagIcon />}
              onClick={() => setConfirmRosterMovesOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Flag All Leagues
            </Button>
          )}
          {isRosterOptView && (
            <Button
              variant="contained"
              size="small"
              startIcon={<FlagIcon />}
              onClick={() => setConfirmRosterOptOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Flag All Leagues
            </Button>
          )}
          {isThursdayView && (
            <Button
              variant="contained"
              size="small"
              startIcon={<FlagIcon />}
              onClick={() => setConfirmThursdayOpen(true)}
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
          onMakeAdds={handleMakeAdds}
          onOptimise={handleOptimise}
          onThursdayUpdate={handleThursdayUpdate}
        />
      </>
    )
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
        {renderContent()}
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

      <ConfirmDialog
        open={confirmRosterMovesOpen}
        title="Flag All Leagues"
        message="Are you sure you want to flag all leagues as requiring roster moves? This will mark every league so it appears in this list."
        confirmLabel="Flag All"
        confirmColor="primary"
        onCancel={() => setConfirmRosterMovesOpen(false)}
        onConfirm={handleFlagRosterMovesConfirm}
        isLoading={flagRosterMovesMutation.isPending}
      />

      <ConfirmDialog
        open={confirmRosterOptOpen}
        title="Flag All Leagues"
        message="Are you sure you want to flag all leagues as requiring roster optimisation? This will mark every league so it appears in this list."
        confirmLabel="Flag All"
        confirmColor="primary"
        onCancel={() => setConfirmRosterOptOpen(false)}
        onConfirm={handleFlagRosterOptConfirm}
        isLoading={flagRosterOptMutation.isPending}
      />

      <ConfirmDialog
        open={confirmThursdayOpen}
        title="Flag All Leagues"
        message="Are you sure you want to flag all leagues as requiring a Thursday update? This will mark every league so it appears in this list."
        confirmLabel="Flag All"
        confirmColor="primary"
        onCancel={() => setConfirmThursdayOpen(false)}
        onConfirm={handleFlagThursdayConfirm}
        isLoading={flagThursdayMutation.isPending}
      />

    </Box>
  )
}
