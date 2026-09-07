import { useState } from 'react'
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
import RosterDialog from '@/components/RosterDialog'
import { useDefenseManagement } from '@/hooks/useDefenseWeekRanks'

const HEAD_CELL = { fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }
const WEEKS = Array.from({ length: 17 }, (_, i) => i + 1)

function cellColor(cell) {
  if (!cell || cell.unranked || cell.rank == null) return 'error.main'
  if (cell.rank <= 5) return 'success.main'
  if (cell.rank <= 10) return 'warning.main'
  return 'text.primary'
}

function formatCell(cell) {
  const abbr = cell?.abbr
  if (!cell || cell.unranked || cell.rank == null) {
    return abbr ? `NA (${abbr})` : 'NA'
  }
  return abbr ? `#${cell.rank} (${abbr})` : `#${cell.rank}`
}

function faColor(cell) {
  if (cell?.unranked || cell?.rank == null) return '#fff'
  if (cell.fa_rank < cell.rank) return '#fff'
  return 'text.secondary'
}

export default function DefenseManagementPanel() {
  const { data, isLoading, isError, error } = useDefenseManagement()
  const [rosterTarget, setRosterTarget] = useState(null)
  const rows = data?.data ?? []

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
        Defense Management
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!isLoading && isError && (
        <Typography color="error" sx={{ mt: 3 }}>
          {error?.body?.message || error?.message || 'Could not load defense management.'}
        </Typography>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No teams found. Create one in the Setup tab first.
        </Typography>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
          }}
        >
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    ...HEAD_CELL,
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    bgcolor: 'background.paper',
                    minWidth: 200,
                  }}
                >
                  Team
                </TableCell>
                {WEEKS.map((week) => (
                  <TableCell key={week} align="center" sx={{ ...HEAD_CELL, minWidth: 84 }}>
                    {week}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.team_id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                      minWidth: 200,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      onClick={() =>
                        setRosterTarget({
                          teamId: row.team_id,
                          teamName: row.team_name,
                          leagueName: row.league_name,
                        })
                      }
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { color: 'secondary.main', textDecoration: 'underline' },
                      }}
                    >
                      {row.league_name || row.team_name}
                    </Typography>
                  </TableCell>
                  {WEEKS.map((week) => {
                    const cell = row.weeks?.[week - 1]
                    return (
                      <TableCell key={week} align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.15 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: cellColor(cell), fontFamily: 'monospace' }}
                          >
                            {formatCell(cell)}
                          </Typography>
                          {cell?.fa_rank != null && (
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: faColor(cell), fontFamily: 'monospace' }}
                            >
                              {cell.fa_abbr ? `#${cell.fa_rank} (${cell.fa_abbr})` : `#${cell.fa_rank}`}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
