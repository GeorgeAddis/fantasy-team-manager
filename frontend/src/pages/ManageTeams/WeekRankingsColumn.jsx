import { useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PositionToggle from '@/components/PositionToggle'
import { useWaiverBoard } from '@/hooks/useLeagues'

const POSITION_RANK_ONLY = new Set(['QB', 'K', 'DST'])

function rankField(position) {
  if (position === 'RWT') return 'week_rank'
  if (POSITION_RANK_ONLY.has(position)) return 'week_position_rank'
  return 'week_rank'
}

function matchesPosition(playerPositions, position) {
  if (position === 'RWT') {
    return playerPositions.some((p) => ['RB', 'WR', 'TE'].includes(p))
  }
  return playerPositions.includes(position)
}

function positionRankLabel(player) {
  const pos = (player.positions ?? []).find((p) => ['RB', 'WR', 'TE'].includes(p)) ?? player.positions?.[0] ?? ''
  const rank = player.week_position_rank
  if (!rank || rank >= 999) return pos
  return `${pos}${rank}`
}

const HEADER_SX = {
  fontWeight: 700,
  color: 'text.secondary',
  fontSize: '0.8rem',
}

const CELL_SX = {
  fontSize: '0.8rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export default function WeekRankingsColumn({ leagueId, teamId }) {
  const [position, setPosition] = useState('QB')
  const { data, isLoading } = useWaiverBoard(leagueId, teamId)

  const isRwt = position === 'RWT'
  const field = rankField(position)

  const rows = useMemo(() => {
    if (!data) return []

    const myPlayers = (data.my_players ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .filter((p) => p[field] != null)
      .map((p) => ({ ...p, _mine: true, _rank: p[field] }))

    const available = (data.available ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .filter((p) => p[field] != null)
      .map((p) => ({ ...p, _rank: p[field] }))
      .sort((a, b) => a._rank - b._rank)

    if (available.length === 0) return myPlayers.sort((a, b) => a._rank - b._rank)

    // Show all my players, plus available players better than my worst + 10 after
    let cutoffRank = null
    if (myPlayers.length > 0) {
      const worstMyRank = Math.max(...myPlayers.map((p) => p._rank))
      const availableBeyond = available.filter((p) => p._rank > worstMyRank)
      if (availableBeyond.length > 10) {
        cutoffRank = availableBeyond[9]._rank
      }
    } else {
      if (available.length > 30) {
        cutoffRank = available[29]._rank
      }
    }

    const availableFiltered = cutoffRank != null
      ? available.filter((p) => p._rank <= cutoffRank)
      : available

    const merged = [...myPlayers, ...availableFiltered]
    merged.sort((a, b) => a._rank - b._rank)
    return merged
  }, [data, position, field])

  const gridCols = isRwt ? '50px 1fr 50px 60px' : '50px 1fr 50px'

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Week
      </Typography>
      <PositionToggle value={position} onChange={setPosition} sx={{ mb: 2 }} />

      {isLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}

      {!isLoading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No ranked players for this position.
        </Typography>
      )}

      {!isLoading && rows.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              px: 1.5,
              py: 0.75,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography sx={HEADER_SX}>Rank</Typography>
            <Typography sx={HEADER_SX}>Name</Typography>
            <Typography sx={HEADER_SX}>Bye</Typography>
            {isRwt && <Typography sx={HEADER_SX}>Pos</Typography>}
          </Box>

          <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
            {rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  px: 1.5,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: row._mine ? 'rgba(212,165,116,0.12)' : 'transparent',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ ...CELL_SX, fontWeight: 700, color: row._mine ? 'secondary.main' : 'text.primary' }}
                >
                  {row._rank}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ ...CELL_SX, color: row._mine ? 'secondary.main' : 'text.primary' }}
                >
                  {row.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ ...CELL_SX, color: row._mine ? 'secondary.main' : 'text.secondary' }}
                >
                  {row.bye_week ?? '—'}
                </Typography>
                {isRwt && (
                  <Typography
                    variant="body2"
                    sx={{ ...CELL_SX, color: row._mine ? 'secondary.main' : 'text.secondary' }}
                  >
                    {positionRankLabel(row)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
