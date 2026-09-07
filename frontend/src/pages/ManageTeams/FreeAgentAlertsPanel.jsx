import { useState } from 'react'
import {
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'
import RosterDialog from '@/components/RosterDialog'
import { useTeamFreeAgentAlerts } from '@/hooks/useTeams'

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

const GRID_COLS = '1fr repeat(5, 72px)'

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

export default function FreeAgentAlertsPanel() {
  const { data, isLoading, isError, error } = useTeamFreeAgentAlerts()
  const [rosterTarget, setRosterTarget] = useState(null)
  const teams = data?.data ?? []

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
        Free Agent Alerts
      </Typography>

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
          No teams have a top-150 player available.
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
            </Box>

            {team.players.map((player) => (
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
                    color: player.status === 'WW' ? 'warning.main' : 'text.primary',
                  }}
                >
                  {statusLabel(player.status)}
                </Typography>
              </Box>
            ))}
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
