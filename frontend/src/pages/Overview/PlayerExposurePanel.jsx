import { useMemo, useState } from 'react'
import {
  Box,
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
import PositionToggle from '@/components/PositionToggle'
import { usePlayerExposure } from '@/hooks/usePlayers'

const HEAD_CELL = { fontWeight: 700, color: 'text.secondary' }
const EXPOSURE_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'RWT', 'DST', 'K', 'TOP24', 'TOP48']

function formatPositions(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return '—'
  return positions.join('/')
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

function isRankedWithin(rank, max) {
  return Number.isFinite(rank) && rank >= 1 && rank <= max
}

function isTopNPlayer(row, max) {
  return isRankedWithin(Number(row.season_rank), max)
    || isRankedWithin(Number(row.season_rank_non_ppr), max)
}

function bestSeasonRank(row) {
  const ranks = [Number(row.season_rank), Number(row.season_rank_non_ppr)]
    .filter((r) => Number.isFinite(r) && r > 0 && r < 999)
  return ranks.length ? Math.min(...ranks) : 999
}

function expandPositionFilter(selected) {
  if (selected === 'RWT') return new Set(['RB', 'WR', 'TE'])
  return new Set([selected])
}

const TOP_N_FILTERS = {
  TOP24: 24,
  TOP48: 48,
}

export default function PlayerExposurePanel() {
  const { data, isLoading } = usePlayerExposure()
  const [position, setPosition] = useState('ALL')
  const rows = data?.data ?? []
  const totalTeams = data?.total_teams ?? 0

  const filteredRows = useMemo(() => {
    if (position === 'ALL') return rows

    const topN = TOP_N_FILTERS[position]
    if (topN != null) {
      return [...rows]
        .filter((row) => isTopNPlayer(row, topN))
        .sort((a, b) =>
          (Number(b.exposure_pct) || 0) - (Number(a.exposure_pct) || 0)
          || bestSeasonRank(a) - bestSeasonRank(b)
          || a.name.localeCompare(b.name),
        )
    }

    const filterSet = expandPositionFilter(position)
    return rows.filter((row) =>
      (row.positions ?? []).some((pos) => filterSet.has(pos)),
    )
  }, [rows, position])

  const emptyMessage = rows.length === 0
    ? 'No rostered players found on your teams yet.'
    : TOP_N_FILTERS[position] != null
      ? `None of your rostered players are in the top ${TOP_N_FILTERS[position]} season rankings.`
      : 'No players match the selected position.'

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
        Player Exposure
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Players on your teams across all leagues
        {totalTeams > 0 ? ` (${totalTeams} team${totalTeams === 1 ? '' : 's'})` : ''}.
      </Typography>

      <PositionToggle
        value={position}
        onChange={setPosition}
        positions={EXPOSURE_POSITIONS}
        sx={{ mb: 2.5 }}
      />

      {isLoading && <CircularProgress sx={{ mt: 2 }} />}

      {!isLoading && filteredRows.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {emptyMessage}
        </Typography>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 900,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_CELL}>Player</TableCell>
                <TableCell sx={HEAD_CELL}>Position</TableCell>
                <TableCell sx={HEAD_CELL}>Franchise</TableCell>
                <TableCell sx={HEAD_CELL} align="right">Teams</TableCell>
                <TableCell sx={HEAD_CELL} align="right">Exposure</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatPositions(row.positions)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.irl_franchise_abbr || row.irl_franchise_name || 'FA'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {row.team_count}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontFamily="monospace">
                      {formatPct(row.exposure_pct)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
