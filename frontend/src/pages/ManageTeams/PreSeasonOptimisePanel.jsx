import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SyncIcon from '@mui/icons-material/Sync'
import ConfirmDialog from '@/components/ConfirmDialog'
import RosterUpdateResultDialog from '@/components/RosterUpdateResultDialog'
import PositionToggle from '@/components/PositionToggle'
import {
  useFlagPreSeasonOptimisation,
  useLeagueList,
  useUpdateLeague,
  useUpdateRosters,
} from '@/hooks/useLeagues'
import {
  useTeamPreSeasonOptimiseAnalysis,
  useTeamRoster,
} from '@/hooks/useTeams'
import { useSettings } from '@/hooks/useSettings'

const POSITION_COLORS = {
  QB: '#e57373',
  RB1: '#64b5f6',
  RB2: '#64b5f6',
  WR1: '#81c784',
  WR2: '#81c784',
  WR3: '#81c784',
  RB: '#64b5f6',
  WR: '#81c784',
  TE: '#ffb74d',
  FLEX: '#ce93d8',
  K: '#a1887f',
  DST: '#90a4ae',
}

const STARTER_POSITIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'RWT', 'K', 'DST']
const SLOT_LABELS = { QB: 'QB', RB1: 'RB1', RB2: 'RB2', WR1: 'WR1', WR2: 'WR2', WR3: 'WR3', TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN' }
const HEAD_CELL = { fontWeight: 700, color: 'text.secondary' }

function formatUpdatedAt(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function expandPositionFilter(selected) {
  // Expand RWT to its component flex positions for matching.
  const positions = new Set()
  for (const p of selected) {
    if (p === 'RWT') {
      positions.add('RB')
      positions.add('WR')
      positions.add('TE')
    } else {
      positions.add(p)
    }
  }
  return positions
}

function hasPosition(player, positionsSet) {
  return (player.positions ?? []).some((p) => positionsSet.has(p))
}

const LINEUP_LABEL = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR',
  TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
}

const HEADER_SX = {
  fontWeight: 700,
  color: 'text.secondary',
  fontSize: '0.7rem',
}

const CELL_SX = {
  fontSize: '0.8rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function displayBoardName(player) {
  if (!player._mine) return player.name
  const label = LINEUP_LABEL[player.lineup_position] ?? player.lineup_position
  return label ? `${player.name} (${label})` : player.name
}

/**
 * Merge my players + free agents for the selected positions, sorted by season rank.
 * Keeps all of my players at those positions (unranked mine sink to the bottom),
 * and available players through 10 spots past my worst ranked player
 * (same windowing as SeasonRankingsExpanded).
 */
function buildPositionBoard(myPlayers, freeAgents, selectedPositions) {
  const filterSet = expandPositionFilter(selectedPositions)
  if (filterSet.size === 0) return []

  const isRanked = (p) => p.season_rank != null && p.season_rank > 0 && p.season_rank < 999

  const mineEligible = (myPlayers ?? [])
    .filter((p) => hasPosition(p, filterSet))
    .map((p) => ({ ...p, _mine: true }))

  const mineRanked = mineEligible.filter(isRanked)
  const mineUnranked = mineEligible.filter((p) => !isRanked(p))

  const available = (freeAgents ?? [])
    .filter((p) => hasPosition(p, filterSet))
    .filter(isRanked)
    .slice()
    .sort((a, b) => a.season_rank - b.season_rank)

  let cutoffRank = null
  if (mineRanked.length > 0) {
    const worstMyRank = Math.max(...mineRanked.map((p) => p.season_rank))
    const availableBeyond = available.filter((p) => p.season_rank > worstMyRank)
    if (availableBeyond.length > 10) {
      cutoffRank = availableBeyond[9].season_rank
    }
  } else if (available.length > 30) {
    cutoffRank = available[29].season_rank
  }

  const availableFiltered = cutoffRank != null
    ? available.filter((p) => p.season_rank <= cutoffRank)
    : available

  const ranked = [...mineRanked, ...availableFiltered].sort((a, b) => a.season_rank - b.season_rank)

  // Unranked roster players always appear after everyone with a real rank
  return [...ranked, ...mineUnranked.sort((a, b) => a.name.localeCompare(b.name))]
}

/**
 * Compute swap suggestions: pool together all of my players and all FAs
 * eligible for any selected position, then greedily pair the best remaining
 * FA with my worst remaining player while the FA outranks them.
 *
 * When exactly one base position is selected, comparisons use
 * `season_position_rank` (the within-position rank). When multiple positions
 * are selected, comparisons use overall `season_rank` since cross-position
 * position ranks aren't comparable.
 */
function computeSuggestedAdds(myPlayers, freeAgents, positionsSet) {
  if (positionsSet.size === 0) return []
  const singlePosition = positionsSet.size === 1
  const useKey = singlePosition ? 'season_position_rank' : 'season_rank'

  const eligible = (p) => hasPosition(p, positionsSet) && p[useKey] != null

  const mySorted = myPlayers.filter(eligible).slice().sort((a, b) => a[useKey] - b[useKey])
  const faSorted = freeAgents.filter(eligible).slice().sort((a, b) => a[useKey] - b[useKey])

  const suggestions = []
  let myIdx = mySorted.length - 1
  let faIdx = 0

  while (myIdx >= 0 && faIdx < faSorted.length) {
    const mine = mySorted[myIdx]
    const fa = faSorted[faIdx]
    if (fa[useKey] < mine[useKey]) {
      suggestions.push({
        position: fa.positions?.[0] ?? '',
        current_player: mine.name,
        current_season_rank: mine.season_rank,
        current_season_position_rank: mine.season_position_rank,
        current_positions: mine.positions,
        player_name: fa.name,
        player_season_rank: fa.season_rank,
        player_season_position_rank: fa.season_position_rank,
        player_positions: fa.positions,
      })
      myIdx--
      faIdx++
    } else {
      break
    }
  }

  return suggestions
}

export default function PreSeasonOptimisePanel() {
  const [position, setPosition] = useState('QB')
  const [addsTarget, setAddsTarget] = useState(null)
  const [confirmFlagOpen, setConfirmFlagOpen] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)

  const { data: leagueData, isLoading: leaguesLoading } = useLeagueList()
  const { data: analysisData, isLoading: analysisLoading } = useTeamPreSeasonOptimiseAnalysis()
  const { data: settingsData } = useSettings()
  const flagMutation = useFlagPreSeasonOptimisation()
  const updateLeagueMutation = useUpdateLeague()
  const rosterMutation = useUpdateRosters()

  const activeRosterId = addsTarget?.myTeam?.id ?? null
  const { data: rosterPanelData, isLoading: rosterPanelLoading } = useTeamRoster(
    activeRosterId,
    { enabled: activeRosterId != null },
  )

  const currentWeek = parseInt(settingsData?.data?.current_week ?? '0', 10)
  const isLoading = leaguesLoading || analysisLoading

  const rows = useMemo(() => {
    const leagues = leagueData?.data ?? []
    const analysisList = analysisData?.data ?? []

    const analysisMap = {}
    for (const entry of analysisList) {
      analysisMap[entry.id] = entry
    }

    const positionsSet = expandPositionFilter([position])

    return leagues
      .map((league) => {
        if (!league.requires_pre_season_optimised) return null
        const myTeam = league.teams?.find((t) => t.my_team) ?? null
        if (!myTeam) return null
        const analysis = analysisMap[myTeam.id]
        if (!analysis) return null

        const suggestedAdds = computeSuggestedAdds(
          analysis.my_players ?? [],
          analysis.free_agents ?? [],
          positionsSet,
        )

        if (suggestedAdds.length === 0) return null

        return { league, myTeam, analysis, suggestedAdds }
      })
      .filter(Boolean)
  }, [leagueData, analysisData, position])

  function handleFlagConfirm() {
    flagMutation.mutate(undefined, {
      onSuccess: () => setConfirmFlagOpen(false),
    })
  }

  function handleMakeAdds(row) {
    setAddsTarget({
      league: row.league,
      myTeam: row.myTeam,
      suggestedAdds: row.suggestedAdds,
      myPlayers: row.analysis?.my_players ?? [],
      freeAgents: row.analysis?.free_agents ?? [],
      position,
    })
  }

  function handleAddsBack() {
    setAddsTarget(null)
  }

  function handleCompleteAdds() {
    updateLeagueMutation.mutate(
      { id: addsTarget.league.id, requires_pre_season_optimised: false },
      { onSuccess: () => setAddsTarget(null) },
    )
  }

  function handleUpdate(league) {
    setUpdateTarget(league)
    rosterMutation.reset()
    rosterMutation.mutate({ leagueId: league.id })
  }

  function closeUpdateResult() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    rosterMutation.reset()
  }

  function byeRowColor(byeWeek) {
    if (!byeWeek || !currentWeek) return undefined
    if (byeWeek === currentWeek) return 'rgba(211,47,47,0.15)'
    if (byeWeek === currentWeek + 1) return 'rgba(33,150,243,0.15)'
    return undefined
  }

  function RosterRow({ slot }) {
    const player = slot.player
    const bgColor = player ? byeRowColor(player.bye_week) : undefined
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '52px 1fr 40px 55px 35px',
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
              {player.bye_week ?? '—'}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.8rem' }}>Empty</Typography>
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
                gridTemplateColumns: '52px 1fr 40px 55px 35px',
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

  if (addsTarget) {
    const boardPosition = addsTarget.position ?? position
    const boardRows = buildPositionBoard(
      addsTarget.myPlayers ?? [],
      addsTarget.freeAgents ?? [],
      [boardPosition],
    )

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
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Suggested Adds
            </Typography>
            <PositionToggle
              value={boardPosition}
              onChange={(next) => setAddsTarget((prev) => (prev ? { ...prev, position: next } : prev))}
              sx={{ mb: 2 }}
            />

            {boardRows.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                No ranked players for this position.
              </Typography>
            ) : (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 40px 55px 35px',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.75,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={HEADER_SX}>Name</Typography>
                  <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SZN</Typography>
                  <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SPos</Typography>
                  <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
                </Box>

                <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {boardRows.map((row) => {
                    const bgColor = row._mine
                      ? (byeRowColor(row.bye_week) ?? 'rgba(212,165,116,0.12)')
                      : (byeRowColor(row.bye_week) ?? 'transparent')
                    return (
                      <Box
                        key={`${row._mine ? 'mine' : 'fa'}-${row.id}`}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 40px 55px 35px',
                          gap: 0.5,
                          px: 1.5,
                          py: 0.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: bgColor,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ ...CELL_SX, color: row._mine ? 'secondary.main' : 'text.primary' }}
                        >
                          {displayBoardName(row)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                          {formatRank(row.season_rank)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                          {formatPosRank(row.positions, row.season_position_rank)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                          {row.bye_week ?? '—'}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ width: '1px', bgcolor: 'divider' }} />

          {renderRosterPanel()}
        </Box>
      </>
    )
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
          Pre Season Optimise
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<FlagIcon />}
          onClick={() => setConfirmFlagOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Flag All Leagues
        </Button>
      </Box>

      <PositionToggle value={position} onChange={setPosition} sx={{ mb: 2.5 }} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No teams require pre-season optimisation for {position}.
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            maxWidth: 800,
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_CELL}>League</TableCell>
                <TableCell sx={HEAD_CELL}>Last Updated</TableCell>
                <TableCell sx={HEAD_CELL}>Suggested Adds</TableCell>
                <TableCell sx={HEAD_CELL}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.league.id} sx={{ '&:last-child td': { borderBottom: 0 }, verticalAlign: 'top' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ pt: 0.5 }}>
                      {row.league.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.league.teams_updated_at ? (
                      <Typography variant="body2" sx={{ pt: 0.5 }}>
                        {formatUpdatedAt(row.league.teams_updated_at)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', pt: 0.5 }}>
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => handleMakeAdds(row)}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Make Adds
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={
                        rosterMutation.isPending && updateTarget?.id === row.league.id
                          ? <CircularProgress size={16} color="inherit" />
                          : <SyncIcon />
                      }
                      onClick={() => handleUpdate(row.league)}
                      disabled={rosterMutation.isPending}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={confirmFlagOpen}
        title="Flag All Leagues"
        message="Are you sure you want to flag all leagues as requiring pre-season optimisation? This will mark every league so it appears in this list."
        confirmLabel="Flag All"
        confirmColor="primary"
        onCancel={() => setConfirmFlagOpen(false)}
        onConfirm={handleFlagConfirm}
        isLoading={flagMutation.isPending}
      />

      <RosterUpdateResultDialog
        open={Boolean(updateTarget)}
        onClose={closeUpdateResult}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        isPending={rosterMutation.isPending}
        result={rosterMutation.data}
        error={rosterMutation.error}
      />
    </>
  )
}
