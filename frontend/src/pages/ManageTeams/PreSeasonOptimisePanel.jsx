import { useMemo, useState } from 'react'
import {
  Alert,
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorIcon from '@mui/icons-material/Error'
import FlagIcon from '@mui/icons-material/Flag'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import SyncIcon from '@mui/icons-material/Sync'
import ConfirmDialog from '@/components/ConfirmDialog'
import PasteDataDialog from '@/components/PasteDataDialog'
import PositionToggleMulti from '@/components/PositionToggleMulti'
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

function formatPosRankOrPos(positions, rank) {
  const prefix = posPrefix(positions?.[0] ?? '')
  if (rank == null || rank >= 999) return prefix
  return `${prefix}${rank}`
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
  const [positions, setPositions] = useState([])
  const [addsTarget, setAddsTarget] = useState(null)
  const [confirmFlagOpen, setConfirmFlagOpen] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [rosterText, setRosterText] = useState('')

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

    const positionsSet = expandPositionFilter(positions)

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
  }, [leagueData, analysisData, positions])

  function handleFlagConfirm() {
    flagMutation.mutate(undefined, {
      onSuccess: () => setConfirmFlagOpen(false),
    })
  }

  function handleMakeAdds(row) {
    setAddsTarget({ league: row.league, myTeam: row.myTeam, suggestedAdds: row.suggestedAdds })
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

  function openUpdateDialog(league) {
    setUpdateTarget(league)
    setRosterText('')
    rosterMutation.reset()
  }

  function closeUpdateDialog() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    setRosterText('')
    rosterMutation.reset()
  }

  function handleUpdateSubmit() {
    if (!updateTarget || !rosterText.trim()) return
    rosterMutation.mutate({ leagueId: updateTarget.id, data: rosterText })
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
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Suggested Adds
            </Typography>
            {(!adds || adds.length === 0) ? (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                No suggested adds — no free agent ranks higher than your roster.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {adds.map((a, i) => {
                  const currentPos = a.current_positions?.[0] ?? ''
                  const faPos = a.player_positions?.[0] ?? ''
                  return (
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
                      label={formatPosRankOrPos(a.current_positions, a.current_season_position_rank)}
                      size="small"
                      sx={{
                        width: 60,
                        height: 24,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        flexShrink: 0,
                        bgcolor: POSITION_COLORS[currentPos] ?? '#616161',
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
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
                      {formatRank(a.current_season_rank)}
                    </Typography>
                    <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                    <Chip
                      label={formatPosRankOrPos(a.player_positions, a.player_season_position_rank)}
                      size="small"
                      sx={{
                        width: 60,
                        height: 24,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        flexShrink: 0,
                        bgcolor: POSITION_COLORS[faPos] ?? '#616161',
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
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
                      {formatRank(a.player_season_rank)}
                    </Typography>
                  </Box>
                  )
                })}
              </Box>
            )}
          </Box>

          <Box sx={{ width: '1px', bgcolor: 'divider' }} />

          {renderRosterPanel()}
        </Box>
      </>
    )
  }

  const updateResult = rosterMutation.data

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

      <PositionToggleMulti value={positions} onChange={setPositions} sx={{ mb: 2.5 }} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : positions.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          Select one or more positions to see teams with roster upgrades available.
        </Typography>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No teams require pre-season optimisation for the selected positions.
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
                      startIcon={<SyncIcon />}
                      onClick={() => openUpdateDialog(row.league)}
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

      <PasteDataDialog
        open={Boolean(updateTarget)}
        onClose={closeUpdateDialog}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        text={rosterText}
        onTextChange={setRosterText}
        placeholder={'TeamName\nQB\nPlayer One\nPlayer Two\nRB\nPlayer Three\n...'}
        onSubmit={handleUpdateSubmit}
        isPending={rosterMutation.isPending}
        submitDisabled={!rosterText.trim()}
        showSubmit={!updateResult}
        closeLabel={updateResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste the full roster data below. This will replace all existing
          lineup slots for every team in this league.
        </Typography>

        {rosterMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {rosterMutation.error?.body?.message || rosterMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {updateResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {updateResult.teams_matched} team{updateResult.teams_matched !== 1 ? 's' : ''} — {updateResult.slots_created} lineup slot{updateResult.slots_created !== 1 ? 's' : ''} created.
            </Alert>

            {updateResult.teams_not_found?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Teams not matched to league: {updateResult.teams_not_found.join(', ')}
              </Alert>
            )}

            {updateResult.players_not_found?.length > 0 && (
              <Box
                sx={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  fontSize: '0.8rem',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  Players not found in database ({updateResult.players_not_found.length})
                </Typography>
                {updateResult.players_not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    {p.team} / {p.section}: {p.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </PasteDataDialog>
    </>
  )
}
