import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SyncIcon from '@mui/icons-material/Sync'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloseIcon from '@mui/icons-material/Close'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GavelIcon from '@mui/icons-material/Gavel'
import TuneIcon from '@mui/icons-material/Tune'
import RosterDialog from '@/components/RosterDialog'
import PasteDataDialog from '@/components/PasteDataDialog'
import { useUpdateRosters } from '@/hooks/useLeagues'

function formatUpdatedAt(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const POSITION_COLORS = {
  QB: '#e57373',
  RB1: '#64b5f6',
  RB2: '#64b5f6',
  WR1: '#81c784',
  WR2: '#81c784',
  WR3: '#81c784',
  TE: '#ffb74d',
  FLEX: '#ce93d8',
  K: '#a1887f',
  DST: '#90a4ae',
}

function SuggestedChangesDialog({ open, onClose, changes, leagueName }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            Suggested Changes
          </Typography>
          {leagueName && (
            <Typography variant="caption" display="block" color="text.secondary">
              {leagueName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2.5 }}>
        {(!changes || changes.length === 0) ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No changes suggested.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {changes.map((c, i) => (
              <Box
                key={i}
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
                <Chip
                  label={c.position}
                  size="small"
                  sx={{
                    width: 52,
                    height: 24,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    bgcolor: POSITION_COLORS[c.position] ?? '#616161',
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
                  {c.current_player ?? 'Empty'}
                </Typography>
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
                  {c.bench_player ?? 'Empty'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

const HEAD_CELL = { fontWeight: 700, color: 'text.secondary' }

/**
 * rows: [{ league, myTeam, analysis }]
 * variant: 'all' | 'require-lineup-change'
 */
export default function TeamsTable({ rows, isLoading, variant, onMakeClaims, onMakeAdds, onOptimise, onThursdayUpdate }) {
  const [rosterTarget, setRosterTarget] = useState(null)
  const [changesTarget, setChangesTarget] = useState(null)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [rosterText, setRosterText] = useState('')
  const rosterMutation = useUpdateRosters()

  const isLineupChange = variant === 'require-lineup-change'
  const isRosterMoves = variant === 'require-roster-moves'
  const isRosterOpt = variant === 'roster-optimisation'
  const isWaiverClaims = variant === 'require-waiver-claims'
  const isThursdayUpdate = variant === 'thursday-update'

  function openUpdateDialog(league) {
    setUpdateTarget(league)
    setRosterText('')
    rosterMutation.reset()
  }

  function closeUpdateDialog() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    setRosterText('')
    rosterMutation.reset()
  }

  function handleUpdateSubmit() {
    if (!updateTarget || !rosterText.trim()) return
    rosterMutation.mutate({ leagueId: updateTarget.id, data: rosterText })
  }

  const result = rosterMutation.data

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 3 }}>
        {isLineupChange
          ? 'No teams require a lineup change this week.'
          : isRosterMoves
            ? 'No teams require roster moves.'
            : isRosterOpt
              ? 'No leagues require roster optimisation.'
              : isWaiverClaims
                ? 'No leagues require waiver claims.'
                : isThursdayUpdate
                  ? 'No leagues require a Thursday update.'
              : 'No leagues found. Create one in the Setup tab first.'}
      </Typography>
    )
  }

  return (
    <>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          maxWidth: (isLineupChange || isRosterMoves || isRosterOpt || isThursdayUpdate) ? 960 : 800,
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={HEAD_CELL}>League</TableCell>
              <TableCell sx={HEAD_CELL}>Last Updated</TableCell>
              {isLineupChange && <TableCell sx={HEAD_CELL}>Suggested Changes</TableCell>}
              {isRosterMoves && <TableCell sx={HEAD_CELL}>Suggested Adds</TableCell>}
              {isRosterOpt && <TableCell sx={HEAD_CELL}>Optimise Roster</TableCell>}
              {isThursdayUpdate && <TableCell sx={HEAD_CELL}>Thursday Update</TableCell>}
              <TableCell sx={HEAD_CELL}>Roster</TableCell>
              <TableCell sx={HEAD_CELL}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ league, myTeam, analysis, rosterAdd }) => (
              <TableRow key={league.id} sx={{ '&:last-child td': { borderBottom: 0 }, verticalAlign: 'top' }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ pt: (isLineupChange || isRosterMoves || isRosterOpt || isThursdayUpdate) ? 0.5 : 0 }}>
                    {league.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {league.teams_updated_at ? (
                    <Typography variant="body2" sx={{ pt: (isLineupChange || isRosterMoves || isRosterOpt || isThursdayUpdate) ? 0.5 : 0 }}>
                      {formatUpdatedAt(league.teams_updated_at)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', pt: (isLineupChange || isRosterMoves || isRosterOpt) ? 0.5 : 0 }}>
                      Never
                    </Typography>
                  )}
                </TableCell>
                {isLineupChange && (
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CompareArrowsIcon />}
                      onClick={() => setChangesTarget({ changes: analysis?.suggested_changes, leagueName: league.name })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      View Changes
                    </Button>
                  </TableCell>
                )}
                {isRosterMoves && (
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => onMakeAdds?.({ league, myTeam, rosterAdd })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Make Adds
                    </Button>
                  </TableCell>
                )}
                {isRosterOpt && (
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<TuneIcon />}
                      onClick={() => onOptimise?.({ league, myTeam })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Optimise
                    </Button>
                  </TableCell>
                )}
                {isThursdayUpdate && (
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SyncIcon />}
                      onClick={() => onThursdayUpdate?.({ league, myTeam, analysis, rosterAdd })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Update
                    </Button>
                  </TableCell>
                )}
                <TableCell>
                  {myTeam && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ListAltIcon />}
                      onClick={() => setRosterTarget({ teamId: myTeam.id, teamName: myTeam.name, leagueName: league.name })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      View Roster
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {isWaiverClaims ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<GavelIcon />}
                      onClick={() => onMakeClaims?.({ league, myTeam })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Make Claims
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SyncIcon />}
                      onClick={() => openUpdateDialog(league)}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Update
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RosterDialog
        open={Boolean(rosterTarget)}
        onClose={() => setRosterTarget(null)}
        teamId={rosterTarget?.teamId}
        teamName={rosterTarget?.teamName}
        leagueName={rosterTarget?.leagueName}
      />

      <SuggestedChangesDialog
        open={Boolean(changesTarget)}
        onClose={() => setChangesTarget(null)}
        changes={changesTarget?.changes}
        leagueName={changesTarget?.leagueName}
      />

      <PasteDataDialog
        open={Boolean(updateTarget)}
        onClose={closeUpdateDialog}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        text={rosterText}
        onTextChange={setRosterText}
        placeholder={'TeamName\nQB\nPlayer One\nPlayer Two\nRB\nPlayer Three\n...'}
        onSubmit={handleUpdateSubmit}
        isPending={rosterMutation.isPending}
        submitDisabled={!rosterText.trim()}
        showSubmit={!result}
        closeLabel={result ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste the full roster data below. This will replace all existing
          lineup slots for every team in this league.
        </Typography>

        {rosterMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {rosterMutation.error?.body?.message || rosterMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {result && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {result.teams_matched} team{result.teams_matched !== 1 ? 's' : ''} — {result.slots_created} lineup slot{result.slots_created !== 1 ? 's' : ''} created.
            </Alert>

            {result.teams_not_found?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Teams not matched to league: {result.teams_not_found.join(', ')}
              </Alert>
            )}

            {result.players_not_found?.length > 0 && (
              <Box
                sx={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  fontSize: '0.8rem',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  Players not found in database ({result.players_not_found.length})
                </Typography>
                {result.players_not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    {p.team} / {p.section}: {p.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </PasteDataDialog>
    </>
  )
}
