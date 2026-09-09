import { Box, Chip, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ErrorIcon from '@mui/icons-material/Error'

const POSITION_COLORS = {
  QB: '#e57373',
  RB1: '#64b5f6',
  RB2: '#64b5f6',
  WR1: '#81c784',
  WR2: '#81c784',
  WR3: '#81c784',
  TE: '#ffb74d',
  RWT: '#ce93d8',
  FLEX: '#ce93d8',
  K: '#a1887f',
  DST: '#90a4ae',
  BN: '#616161',
}

const SLOT_LABELS = {
  QB: 'QB', RB1: 'RB1', RB2: 'RB2', WR1: 'WR1', WR2: 'WR2', WR3: 'WR3',
  TE: 'TE', RWT: 'FLEX', FLEX: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
}

const GRID = '52px 1fr 40px 55px 40px 55px 35px'

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

function byeRowColor(byeWeek, currentWeek) {
  if (!byeWeek || !currentWeek) return undefined
  if (byeWeek === currentWeek) return 'rgba(211,47,47,0.15)'
  if (byeWeek === currentWeek + 1) return 'rgba(33,150,243,0.15)'
  return undefined
}

function LineupRow({ slot, currentWeek }) {
  const player = slot.player
  const bgColor = player ? byeRowColor(player.bye_week, currentWeek) : undefined
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: GRID,
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
            {formatRank(player.week_rank)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
            {formatPosRank(player.positions, player.week_position_rank)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', textAlign: 'right' }}>
            {player.bye_week ?? '—'}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', fontSize: '0.8rem' }}>
            EMPTY SLOT
          </Typography>
          <Typography variant="caption" />
          <Typography variant="caption" />
          <Typography variant="caption" />
          <Typography variant="caption" />
          <Typography variant="caption" />
        </>
      )}
    </Box>
  )
}

function weekPosOnlySlot(position) {
  if (position === 'DST' || position === 'DEF') return 'DST'
  if (position === 'QB' || position === 'K') return position
  return null
}

/** QB/K/DST have no overall week rank — show QB1, K8, D1. Everyone else uses #overall. */
export function formatChangeWeekRank(position, weekRank, weekPosRank) {
  const posOnly = weekPosOnlySlot(position)
  if (posOnly) {
    if (weekPosRank == null || weekPosRank <= 0 || weekPosRank >= 999) return null
    return `${posOnly === 'DST' ? 'D' : posOnly}${weekPosRank}`
  }
  if (weekRank == null || weekRank <= 0 || weekRank >= 999) return null
  return `#${weekRank}`
}

export function lineupChangeWeekRankLabel(change, side) {
  if (side === 'current') {
    return formatChangeWeekRank(change.position, change.current_week_rank, change.current_week_position_rank)
  }
  return formatChangeWeekRank(change.position, change.player_week_rank, change.player_week_position_rank)
}

export function WeekRank({ rank, position, weekRank, weekPosRank, label }) {
  const text = label ?? formatChangeWeekRank(position, weekRank ?? rank, weekPosRank)
  if (!text) return null
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
      {text}
    </Typography>
  )
}

export function LineupChangeRow({ change }) {
  const isMove = change.kind === 'move'
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
      }}
    >
      {isMove ? (
        <>
          <Chip
            label={change.from_position}
            size="small"
            sx={{
              width: 52,
              height: 24,
              fontWeight: 700,
              fontSize: '0.7rem',
              bgcolor: POSITION_COLORS[change.from_position] ?? '#616161',
              color: '#fff',
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {change.player_name ?? change.bench_player ?? 'Empty'}
          </Typography>
          <WeekRank label={lineupChangeWeekRankLabel(change, 'player')} />
          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Chip
            label={change.position}
            size="small"
            sx={{
              width: 52,
              height: 24,
              fontWeight: 700,
              fontSize: '0.7rem',
              bgcolor: POSITION_COLORS[change.position] ?? '#616161',
              color: '#fff',
            }}
          />
        </>
      ) : (
        <>
          <Chip
            label={change.position}
            size="small"
            sx={{
              width: 52,
              height: 24,
              fontWeight: 700,
              fontSize: '0.7rem',
              bgcolor: POSITION_COLORS[change.position] ?? '#616161',
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
            {change.current_player ?? 'Empty'}
          </Typography>
          <WeekRank label={lineupChangeWeekRankLabel(change, 'current')} />
          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
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
            {change.bench_player ?? 'Empty'}
          </Typography>
          <WeekRank label={lineupChangeWeekRankLabel(change, 'player')} />
        </>
      )}
    </Box>
  )
}

export function LineupChangesView({
  changes = [],
  lineup,
  currentWeek = 0,
  emptyText = 'No lineup changes required — current starting lineup is optimal.',
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Changes
        </Typography>
        {changes.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            {emptyText}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {changes.map((c, i) => (
              <LineupChangeRow key={i} change={c} />
            ))}
          </Box>
        )}
      </Box>
      <Box sx={{ width: '1px', bgcolor: 'divider' }} />
      <OptimalLineupPanel lineup={lineup} currentWeek={currentWeek} />
    </Box>
  )
}

export default function OptimalLineupPanel({ lineup, currentWeek = 0, title = 'Optimal Lineup' }) {
  const starters = lineup?.starters ?? []
  const bench = lineup?.bench ?? []
  const empty = starters.length === 0 && bench.length === 0

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {empty ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          No optimal lineup available.
        </Typography>
      ) : (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID,
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
            <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>Wk</Typography>
            <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>WPos</Typography>
            <Typography sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right' }}>Bye</Typography>
          </Box>
          {starters.map((slot, i) => (
            <LineupRow key={`s-${i}`} slot={slot} currentWeek={currentWeek} />
          ))}
          {bench.length > 0 && (
            <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1 }}>
                BENCH
              </Typography>
            </Box>
          )}
          {bench.map((slot, i) => (
            <LineupRow key={`b-${i}`} slot={slot} currentWeek={currentWeek} />
          ))}
        </Box>
      )}
    </Box>
  )
}
