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

const LINEUP_LABEL = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR',
  TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
}

function displayName(player) {
  if (!player._mine) return player.name
  const label = LINEUP_LABEL[player.lineup_position] ?? player.lineup_position
  return `${player.name} (${label})`
}

function posPrefix(player) {
  const pos = player.positions?.[0] ?? ''
  return pos === 'DST' ? 'D' : pos
}

function formatPosRank(player, rank) {
  if (rank == null || rank >= 999) return '—'
  return `${posPrefix(player)}${rank}`
}

function formatRank(rank) {
  if (rank == null || rank >= 999) return '—'
  return rank
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

function byeRowColor(byeWeek, currentWeek) {
  if (!byeWeek || !currentWeek) return undefined
  if (byeWeek === currentWeek) return 'rgba(211,47,47,0.15)'
  if (byeWeek === currentWeek + 1) return 'rgba(33,150,243,0.15)'
  return undefined
}

export default function SeasonRankingsExpanded({ leagueId, teamId, currentWeek = 0 }) {
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

    // Only show available players ranked better than my best, plus 10 after my worst
    let cutoffRank = null
    if (myPlayers.length > 0) {
      const worstMyRank = Math.max(...myPlayers.map((p) => p.season_rank))
      const availableBeyond = available.filter((p) => p.season_rank > worstMyRank)
      if (availableBeyond.length > 10) {
        cutoffRank = availableBeyond[9].season_rank
      }
    } else {
      if (available.length > 30) {
        cutoffRank = available[29].season_rank
      }
    }

    const availableFiltered = cutoffRank != null
      ? available.filter((p) => p.season_rank <= cutoffRank)
      : available

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
              gridTemplateColumns: '1fr 40px 55px 40px 55px 35px',
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
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Wk</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>WPos</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
          </Box>

          <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
            {rows.map((row) => {
              const bgColor = row._mine
                ? (byeRowColor(row.bye_week, currentWeek) ?? 'rgba(212,165,116,0.12)')
                : (byeRowColor(row.bye_week, currentWeek) ?? 'transparent')
              return (
                <Box
                  key={row.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 40px 55px 40px 55px 35px',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: bgColor,
                  }}
                >
                  <Typography variant="body2" sx={{ ...CELL_SX, color: row._mine ? 'secondary.main' : 'text.primary' }}>
                    {displayName(row)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                    {formatRank(row.season_rank)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                    {formatPosRank(row, row.season_position_rank)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                    {formatRank(row.week_rank)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
                    {formatPosRank(row, row.week_position_rank)}
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
  )
}
