import { useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PositionToggle from '@/components/PositionToggle'
import { useWaiverBoard } from '@/hooks/useLeagues'

function matchesPosition(playerPositions, position) {
  if (position === 'RWT') {
    return playerPositions.some((p) => ['RB', 'WR', 'TE'].includes(p))
  }
  return playerPositions.includes(position)
}

const LINEUP_LABEL = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR',
  TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
}

function displayName(player) {
  if (!player._mine) return player.name
  const label = LINEUP_LABEL[player.lineup_position] ?? player.lineup_position
  return `${player.name} (${label})`
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

function byeTextColor(byeWeek, currentWeek, isMine) {
  if (!byeWeek || !currentWeek) return isMine ? 'secondary.main' : 'text.primary'
  if (byeWeek === currentWeek) return 'error.main'
  if (byeWeek === currentWeek + 1) return 'info.light'
  return isMine ? 'secondary.main' : 'text.primary'
}

export default function SeasonRankingsColumn({ leagueId, teamId, currentWeek = 0, includeWaivers = true }) {
  const [position, setPosition] = useState('QB')
  const { data, isLoading } = useWaiverBoard(leagueId, teamId)

  const rows = useMemo(() => {
    if (!data) return []

    const myPlayers = (data.my_players ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .filter((p) => p.season_rank != null)
      .map((p) => ({ ...p, _mine: true }))

    const available = (data.available ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .filter((p) => p.season_rank != null)
      .filter((p) => includeWaivers || p.status !== 'WW')
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
  }, [data, position, includeWaivers])

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Rest of Season
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
              gridTemplateColumns: '50px 1fr 50px',
              px: 1.5,
              py: 0.75,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography sx={HEADER_SX}>Rank</Typography>
            <Typography sx={HEADER_SX}>Name</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
          </Box>

          <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
            {rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 50px',
                  px: 1.5,
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: row._mine ? 'rgba(212,165,116,0.12)' : 'transparent',
                }}
              >
                {(() => {
                  const byeColor = byeTextColor(row.bye_week, currentWeek, row._mine)
                  const defaultColor = row._mine ? 'secondary.main' : 'text.primary'
                  const secondaryColor = row._mine ? 'secondary.main' : 'text.secondary'
                  const isBye = byeColor !== defaultColor
                  const textColor = isBye ? byeColor : defaultColor
                  const subColor = isBye ? byeColor : secondaryColor
                  return (
                    <>
                      <Typography variant="body2" sx={{ ...CELL_SX, fontWeight: 700, color: textColor }}>
                        {row.season_rank}
                      </Typography>
                      <Typography variant="body2" sx={{ ...CELL_SX, color: textColor }}>
                        {displayName(row)}
                      </Typography>
                      <Typography variant="body2" sx={{ ...CELL_SX, color: subColor, textAlign: 'right' }}>
                        {row.bye_week ?? '—'}
                      </Typography>
                    </>
                  )
                })()}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
