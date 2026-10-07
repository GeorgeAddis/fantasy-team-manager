import { useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PositionToggle from '@/components/PositionToggle'
import { useWaiverBoard } from '@/hooks/useLeagues'

const SEASON_POSITIONS = ['OVR', 'QB', 'RB', 'WR', 'TE', 'RWT', 'DST', 'K']

function isRanked(rank) {
  return rank != null && rank > 0 && rank < 999
}

function matchesPosition(playerPositions, position) {
  if (position === 'OVR') return true
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
  const [position, setPosition] = useState('OVR')
  const { data, isLoading } = useWaiverBoard(leagueId, teamId)

  const rows = useMemo(() => {
    if (!data) return []

    const myPlayers = (data.my_players ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .map((p) => ({
        ...p,
        _mine: true,
        _rank: isRanked(p.season_rank) ? p.season_rank : null,
      }))

    const available = (data.available ?? [])
      .filter((p) => matchesPosition(p.positions ?? [], position))
      .filter((p) => isRanked(p.season_rank))
      .filter((p) => includeWaivers || p.status !== 'WW')
      .map((p) => ({ ...p, _rank: p.season_rank }))
      .sort((a, b) => a._rank - b._rank)

    const mineRanked = myPlayers.filter((p) => p._rank != null)
    const mineUnranked = myPlayers.filter((p) => p._rank == null)
      .sort((a, b) => a.name.localeCompare(b.name))

    if (available.length === 0) {
      mineRanked.sort((a, b) => a._rank - b._rank)
      return [...mineRanked, ...mineUnranked]
    }

    let cutoffRank = null
    if (mineRanked.length > 0) {
      const worstMyRank = Math.max(...mineRanked.map((p) => p._rank))
      const availableBeyond = available.filter((p) => p._rank > worstMyRank)
      if (availableBeyond.length > 10) {
        cutoffRank = availableBeyond[9]._rank
      }
    } else if (available.length > 30) {
      cutoffRank = available[29]._rank
    }

    const availableFiltered = cutoffRank != null
      ? available.filter((p) => p._rank <= cutoffRank)
      : available

    const merged = [...mineRanked, ...availableFiltered]
    merged.sort((a, b) => a._rank - b._rank)
    return [...merged, ...mineUnranked]
  }, [data, position, includeWaivers])

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Rest of Season
      </Typography>
      <PositionToggle value={position} onChange={setPosition} positions={SEASON_POSITIONS} sx={{ mb: 2 }} />

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
                        {row._rank ?? '—'}
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
