import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PositionToggle from '@/components/PositionToggle'
import RosterDialog from '@/components/RosterDialog'
import { useTeamFreeAgentAlerts } from '@/hooks/useTeams'
import HiddenPlayersPanel from './HiddenPlayersPanel'

const WORSE_FILTERS = ['Better', '10', '20', '30', '40', '50', 'Any']
const STATUS_FILTERS = ['FA', 'FA + WW']
const RANK_CAPS = ['Top 100', 'Top 125', 'Top 150', 'Any']

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

const COL_SX = {
  textAlign: 'right',
  fontFamily: 'monospace',
}

const GRID_COLS = 'minmax(0, 1.15fr) 48px 48px 56px 40px 64px minmax(0, 1.15fr) 48px 56px 40px'

function posPrefix(positions) {
  const pos = positions?.[0] ?? ''
  return pos === 'DST' ? 'D' : pos
}

function formatPosRank(positions, rank) {
  if (rank == null || rank >= 999) return '—'
  return `${posPrefix(positions)}${rank}`
}

function formatRank(rank) {
  if (rank == null || rank >= 999) return '—'
  return rank
}

function statusLabel(status) {
  return status === 'WW' ? 'Waivers' : 'FA'
}

function compareRoleLabel(role) {
  return role === 'worst' ? 'Worst' : 'Starter'
}

function seasonRankValue(rank) {
  if (rank == null || rank <= 0 || rank >= 999) return 10000
  return rank
}

function passesWorseFilter(player, filter) {
  if (filter === 'Any') return true
  if (!player.compare) return true

  const worseBy = seasonRankValue(player.season_rank) - seasonRankValue(player.compare.season_rank)
  if (filter === 'Better') return worseBy < 0
  return worseBy <= Number(filter)
}

function passesRankCap(player, cap) {
  if (cap === 'Any') return true
  const limit = Number(cap.replace(/\D/g, ''))
  return seasonRankValue(player.season_rank) <= limit
}

export default function FreeAgentAlertsPanel() {
  const { data, isLoading, isError, error } = useTeamFreeAgentAlerts()
  const [rosterTarget, setRosterTarget] = useState(null)
  const [showHidden, setShowHidden] = useState(false)
  const [worseFilter, setWorseFilter] = useState('Better')
  const [statusFilter, setStatusFilter] = useState('FA')
  const [rankCap, setRankCap] = useState('Any')
  const teams = useMemo(() => {
    return (data?.data ?? [])
      .map((team) => ({
        ...team,
        players: (team.players ?? []).filter((player) => {
          if (statusFilter === 'FA' && player.status === 'WW') return false
          if (!passesRankCap(player, rankCap)) return false
          return passesWorseFilter(player, worseFilter)
        }),
      }))
      .filter((team) => team.players.length > 0)
  }, [data, worseFilter, statusFilter, rankCap])

  if (showHidden) {
    return <HiddenPlayersPanel onBack={() => setShowHidden(false)} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
          Free Agent Alerts
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <PositionToggle
            value={statusFilter}
            onChange={setStatusFilter}
            positions={STATUS_FILTERS}
          />
          <PositionToggle
            value={rankCap}
            onChange={setRankCap}
            positions={RANK_CAPS}
          />
          <PositionToggle
            value={worseFilter}
            onChange={setWorseFilter}
            positions={WORSE_FILTERS}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<VisibilityOffIcon />}
            onClick={() => setShowHidden(true)}
            sx={{ textTransform: 'none' }}
          >
            Hidden Players
          </Button>
        </Box>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!isLoading && isError && (
        <Typography color="error" sx={{ mt: 3 }}>
          {error?.body?.message || error?.message || 'Could not load free agent alerts.'}
        </Typography>
      )}

      {!isLoading && !isError && teams.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {data?.data?.length
            ? 'No players match this filter.'
            : 'No teams have a top-200 player available.'}
        </Typography>
      )}

      {!isLoading && !isError && teams.map((team) => (
        <Box key={team.team_id} sx={{ mb: 3.5 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            onClick={() =>
              setRosterTarget({
                teamId: team.team_id,
                teamName: team.team_name,
                leagueName: team.league_name,
              })
            }
            sx={{
              mb: 1,
              cursor: 'pointer',
              width: 'fit-content',
              '&:hover': { color: 'secondary.main', textDecoration: 'underline' },
            }}
          >
            {team.league_name || team.team_name}
          </Typography>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: 0.5,
                px: 1.5,
                py: 0.75,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={HEADER_SX}>Name</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Pos</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SZN</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SPos</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Status</Typography>
              <Typography sx={{ ...HEADER_SX, pl: 1.5 }}>Yours</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SZN</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SPos</Typography>
              <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
            </Box>

            {team.players.map((player) => {
              const compare = player.compare
              return (
                <Box
                  key={player.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={CELL_SX}>{player.name}</Typography>
                  <Typography variant="body2" sx={{ ...CELL_SX, ...COL_SX, color: 'text.secondary' }}>
                    {(player.positions ?? []).join('/')}
                  </Typography>
                  <Typography variant="caption" sx={{ ...COL_SX, color: '#fff' }}>
                    {formatRank(player.season_rank)}
                  </Typography>
                  <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                    {formatPosRank(player.positions, player.season_position_rank)}
                  </Typography>
                  <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                    {player.bye_week ?? '—'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      ...COL_SX,
                      fontWeight: 700,
                      color: player.status === 'WW' ? 'warning.main' : 'success.main',
                    }}
                  >
                    {statusLabel(player.status)}
                  </Typography>
                  <Box
                    sx={{
                      pl: 1.5,
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      minWidth: 0,
                    }}
                  >
                    {compare ? (
                      <>
                        <Typography variant="body2" sx={CELL_SX}>{compare.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                          {compareRoleLabel(compare.role)}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" sx={{ ...CELL_SX, color: 'text.secondary' }}>—</Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ ...COL_SX, color: compare ? '#fff' : 'text.secondary' }}>
                    {compare ? formatRank(compare.season_rank) : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                    {compare ? formatPosRank(compare.positions, compare.season_position_rank) : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                    {compare?.bye_week ?? '—'}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      ))}

      <RosterDialog
        open={rosterTarget != null}
        onClose={() => setRosterTarget(null)}
        teamId={rosterTarget?.teamId}
        teamName={rosterTarget?.teamName}
        leagueName={rosterTarget?.leagueName}
      />
    </Box>
  )
}
