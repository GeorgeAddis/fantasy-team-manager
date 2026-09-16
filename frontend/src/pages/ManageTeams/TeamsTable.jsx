import { useState } from 'react'
import {
  Box,
  Button,
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
import CloseIcon from '@mui/icons-material/Close'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import GavelIcon from '@mui/icons-material/Gavel'
import TuneIcon from '@mui/icons-material/Tune'
import RosterDialog from '@/components/RosterDialog'
import RosterUpdateResultDialog from '@/components/RosterUpdateResultDialog'
import { useUpdateRosters } from '@/hooks/useLeagues'
import { useSettings } from '@/hooks/useSettings'
import { LineupChangesView } from './OptimalLineupPanel'

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

function SuggestedChangesDialog({ open, onClose, changes, optimalLineup, leagueName, currentWeek = 0 }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
        <LineupChangesView
          changes={changes}
          lineup={optimalLineup}
          currentWeek={currentWeek}
        />
      </DialogContent>
    </Dialog>
  )
}

const HEAD_CELL = { fontWeight: 700, color: 'text.secondary' }

/**
 * rows: [{ league, myTeam, analysis }]
 * variant: 'all' | 'require-lineup-change'
 */
export default function TeamsTable({ rows, isLoading, variant, onMakeClaims, onMakeAdds, onMakePostWaiverMoves, onOptimise, onThursdayUpdate }) {
  const { data: settingsData } = useSettings()
  const currentWeek = parseInt(settingsData?.data?.current_week ?? '0', 10)
  const [rosterTarget, setRosterTarget] = useState(null)
  const [changesTarget, setChangesTarget] = useState(null)
  const [updateTarget, setUpdateTarget] = useState(null)
  const rosterMutation = useUpdateRosters()

  const isLineupChange = variant === 'require-lineup-change'
  const isRosterMoves = variant === 'require-roster-moves'
  const isRosterOpt = variant === 'roster-optimisation'
  const isWaiverClaims = variant === 'require-waiver-claims'
  const isPostWaiverMoves = variant === 'post-waiver-moves'
  const isThursdayUpdate = variant === 'thursday-update'

  function handleUpdate(league) {
    setUpdateTarget(league)
    rosterMutation.reset()
    rosterMutation.mutate({ leagueId: league.id })
  }

  function closeUpdateResult() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    rosterMutation.reset()
  }

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
                : isPostWaiverMoves
                  ? 'No leagues require post-waiver moves.'
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
            {rows.map(({ league, myTeam, analysis, rosterAdd, thursdayRosterAdd }) => (
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
                      onClick={() => setChangesTarget({
                        changes: analysis?.suggested_changes,
                        optimalLineup: analysis?.optimal_lineup,
                        leagueName: league.name,
                      })}
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
                      onClick={() => onThursdayUpdate?.({ league, myTeam, analysis, rosterAdd: thursdayRosterAdd })}
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
                  ) : isPostWaiverMoves ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => onMakePostWaiverMoves?.({ league, myTeam })}
                      sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }}
                    >
                      Make Moves
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={
                        rosterMutation.isPending && updateTarget?.id === league.id
                          ? <CircularProgress size={16} color="inherit" />
                          : <SyncIcon />
                      }
                      onClick={() => handleUpdate(league)}
                      disabled={rosterMutation.isPending}
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
        optimalLineup={changesTarget?.optimalLineup}
        leagueName={changesTarget?.leagueName}
        currentWeek={currentWeek}
      />

      <RosterUpdateResultDialog
        open={Boolean(updateTarget)}
        onClose={closeUpdateResult}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        isPending={rosterMutation.isPending}
        result={rosterMutation.data}
        error={rosterMutation.error}
      />
    </>
  )
}
