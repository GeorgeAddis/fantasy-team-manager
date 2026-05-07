import { useMemo, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PositionToggle from '@/components/PositionToggle'
import { useWaiverBoard } from '@/hooks/useLeagues'

const WAIVER_POSITIONS = ['OVR', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']

const LINEUP_LABEL = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR',
  TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
}

function displayName(player) {
  if (!player._mine) return player.name
  const label = LINEUP_LABEL[player.lineup_position] ?? player.lineup_position
  return `${player.name} (${label})`
}

function posRankLabel(player) {
  const pos = (player.positions ?? [])[0] ?? ''
  const rank = player.waiver_rank
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

function byeTextColor(byeWeek, currentWeek, isMine) {
  if (!byeWeek || !currentWeek) return isMine ? 'secondary.main' : 'text.primary'
  if (byeWeek === currentWeek) return 'error.main'
  if (byeWeek === currentWeek + 1) return 'info.light'
  return isMine ? 'secondary.main' : 'text.primary'
}

export default function TopWaiverColumn({ leagueId, teamId, currentWeek = 0 }) {
  const [position, setPosition] = useState('OVR')
  const { data, isLoading } = useWaiverBoard(leagueId, teamId)

  const isOvr = position === 'OVR'

  const rows = useMemo(() => {
    if (!data) return []

    const rankField = isOvr ? 'waiver_rank_overall' : 'waiver_rank'

    const filterPos = (p) =>
      isOvr ? true : (p.positions ?? []).includes(position)

    const myPlayers = (data.my_players ?? [])
      .filter(filterPos)
      .filter((p) => p[rankField] != null)
      .map((p) => ({ ...p, _mine: true, _rank: p[rankField] }))

    const available = (data.available ?? [])
      .filter(filterPos)
      .filter((p) => p[rankField] != null)
      .map((p) => ({ ...p, _rank: p[rankField] }))
      .sort((a, b) => a._rank - b._rank)

    if (available.length === 0) return myPlayers.sort((a, b) => a._rank - b._rank)

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
  }, [data, position, isOvr])

  const gridCols = isOvr ? '50px 1fr 50px 60px' : '50px 1fr 50px'

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Top Waiver Players Available
      </Typography>
      <PositionToggle
        value={position}
        onChange={setPosition}
        positions={WAIVER_POSITIONS}
        sx={{ mb: 2 }}
      />

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
            {isOvr && <Typography sx={HEADER_SX}>Pos</Typography>}
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
                        {row._rank}
                      </Typography>
                      <Typography variant="body2" sx={{ ...CELL_SX, color: textColor }}>
                        {displayName(row)}
                      </Typography>
                      <Typography variant="body2" sx={{ ...CELL_SX, color: subColor }}>
                        {row.bye_week ?? '—'}
                      </Typography>
                      {isOvr && (
                        <Typography variant="body2" sx={{ ...CELL_SX, color: subColor }}>
                          {posRankLabel(row)}
                        </Typography>
                      )}
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
