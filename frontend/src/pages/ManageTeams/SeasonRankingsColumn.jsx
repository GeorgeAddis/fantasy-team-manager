import { useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PositionToggleMulti from '@/components/PositionToggleMulti'
import { useWaiverBoard } from '@/hooks/useLeagues'

function positionsForFilter(selected) {
  const expanded = new Set()
  for (const s of selected) {
    if (s === 'RWT') {
      expanded.add('RB')
      expanded.add('WR')
      expanded.add('TE')
    } else {
      expanded.add(s)
    }
  }
  return expanded
}

function matchesFilter(playerPositions, filterSet) {
  return playerPositions.some((p) => filterSet.has(p))
}

function positionRankLabel(player) {
  const pos = player.positions?.[0] ?? ''
  const rank = player.season_position_rank
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

export default function SeasonRankingsColumn({ leagueId, teamId }) {
  const [positions, setPositions] = useState(['QB'])
  const { data, isLoading } = useWaiverBoard(leagueId, teamId)

  const rows = useMemo(() => {
    if (!data) return []

    const filterSet = positionsForFilter(positions)
    if (filterSet.size === 0) return []

    const myPlayers = (data.my_players ?? [])
      .filter((p) => matchesFilter(p.positions ?? [], filterSet))
      .filter((p) => p.season_rank != null)
      .map((p) => ({ ...p, _mine: true }))

    const available = (data.available ?? [])
      .filter((p) => matchesFilter(p.positions ?? [], filterSet))
      .filter((p) => p.season_rank != null)
      .sort((a, b) => a.season_rank - b.season_rank)

    if (available.length === 0) return myPlayers.sort((a, b) => a.season_rank - b.season_rank)

    const bestAvailableRank = available[0].season_rank

    // Only show available players ranked better than my best, plus 10 after my worst
    const availableAboveBest = available.filter((p) => p.season_rank < (myPlayers[0]?.season_rank ?? Infinity))

    // Cut off available players 10 spots after my worst ranked player
    let cutoffRank = null
    if (myPlayers.length > 0) {
      const worstMyRank = Math.max(...myPlayers.map((p) => p.season_rank))
      const availableBeyond = available.filter((p) => p.season_rank > worstMyRank)
      if (availableBeyond.length > 10) {
        cutoffRank = availableBeyond[9].season_rank
      }
    } else {
      // None of my players in this position range — show top 30 available
      if (available.length > 30) {
        cutoffRank = available[29].season_rank
      }
    }

    const availableFiltered = cutoffRank != null
      ? available.filter((p) => p.season_rank <= cutoffRank)
      : available

    // Merge all my players + filtered available, sort by season_rank
    const merged = [...myPlayers, ...availableFiltered]
    merged.sort((a, b) => a.season_rank - b.season_rank)

    return merged
  }, [data, positions])

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Rest of Season
      </Typography>
      <PositionToggleMulti value={positions} onChange={setPositions} sx={{ mb: 2 }} />

      {isLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}

      {!isLoading && rows.length === 0 && positions.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No ranked players for this position.
        </Typography>
      )}

      {!isLoading && rows.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 50px 60px',
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
            <Typography sx={HEADER_SX}>Pos</Typography>
          </Box>

          <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
            {rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 50px 60px',
                  px: 1.5,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: row._mine ? 'rgba(212,165,116,0.12)' : 'transparent',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    ...CELL_SX,
                    fontWeight: 700,
                    color: row._mine ? 'secondary.main' : 'text.primary',
                  }}
                >
                  {row.season_rank}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    ...CELL_SX,
                    color: row._mine ? 'secondary.main' : 'text.primary',
                  }}
                >
                  {row.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    ...CELL_SX,
                    color: row._mine ? 'secondary.main' : 'text.secondary',
                  }}
                >
                  {row.bye_week ?? '—'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    ...CELL_SX,
                    color: row._mine ? 'secondary.main' : 'text.secondary',
                  }}
                >
                  {positionRankLabel(row)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
