import { useMemo, useState } from 'react'
import {
  Box,
  Button,
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
import SyncIcon from '@mui/icons-material/Sync'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { useLeagueList, useUpdateRosters, useUpdateAllRosters } from '@/hooks/useLeagues'
import RosterDialog from '@/components/RosterDialog'
import RosterUpdateResultDialog from '@/components/RosterUpdateResultDialog'

function formatUpdatedAt(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UpdateTeamsPage() {
  const leagueQuery = useLeagueList()
  const leagues = leagueQuery.data?.data ?? []
  const [updateTarget, setUpdateTarget] = useState(null)
  const rosterMutation = useUpdateRosters()
  const updateAllRostersMutation = useUpdateAllRosters()
  const [updateAllOpen, setUpdateAllOpen] = useState(false)
  const [rosterTarget, setRosterTarget] = useState(null)

  const sorted = useMemo(() => {
    return [...leagues].sort((a, b) => {
      if (!a.teams_updated_at && !b.teams_updated_at) return 0
      if (!a.teams_updated_at) return -1
      if (!b.teams_updated_at) return 1
      return new Date(a.teams_updated_at) - new Date(b.teams_updated_at)
    })
  }, [leagues])

  function handleUpdate(league) {
    setUpdateTarget(league)
    rosterMutation.reset()
    rosterMutation.mutate({ leagueId: league.id })
  }

  function closeResult() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    rosterMutation.reset()
  }

  function closeUpdateAllResult() {
    if (updateAllRostersMutation.isPending) return
    setUpdateAllOpen(false)
    updateAllRostersMutation.reset()
  }

  return (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h5" color="secondary.main">
          Update Teams
        </Typography>
        {sorted.length > 0 && (
          <Button
            variant="contained"
            size="small"
            startIcon={
              updateAllRostersMutation.isPending
                ? <CircularProgress size={16} color="inherit" />
                : <SyncIcon />
            }
            disabled={updateAllRostersMutation.isPending || rosterMutation.isPending}
            onClick={() => {
              setUpdateAllOpen(true)
              updateAllRostersMutation.reset()
              updateAllRostersMutation.mutate()
            }}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Update All
          </Button>
        )}
      </Box>
      <Typography color="text.secondary" sx={{ mb: 3, textAlign: 'center', width: '100%', maxWidth: 800 }}>
        Sync rosters from Fantrax for each of your leagues.
      </Typography>

      {leagueQuery.isLoading && <CircularProgress sx={{ mt: 4 }} />}

      {!leagueQuery.isLoading && sorted.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>
          No leagues found. Create one in the Setup tab first.
        </Typography>
      )}

      {sorted.length > 0 && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            maxWidth: 800,
            width: '100%',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  League
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Last Updated
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  Roster
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} align="left">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((league) => {
                const updatingThis =
                  rosterMutation.isPending && updateTarget?.id === league.id
                return (
                  <TableRow
                    key={league.id}
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {league.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {league.teams_updated_at ? (
                        <Typography variant="body2">
                          {formatUpdatedAt(league.teams_updated_at)}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                        >
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const myTeam = league.teams?.find((t) => t.my_team)
                        return myTeam ? (
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
                        ) : null
                      })()}
                    </TableCell>
                    <TableCell align="left">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={updatingThis ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                        onClick={() => handleUpdate(league)}
                        disabled={rosterMutation.isPending || updateAllRostersMutation.isPending}
                        sx={{
                          textTransform: 'none',
                          bgcolor: 'primary.main',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <RosterUpdateResultDialog
        open={Boolean(updateTarget)}
        onClose={closeResult}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        isPending={rosterMutation.isPending}
        result={rosterMutation.data}
        error={rosterMutation.error}
      />

      <RosterUpdateResultDialog
        open={updateAllOpen}
        onClose={closeUpdateAllResult}
        title="Update All Rosters"
        isPending={updateAllRostersMutation.isPending}
        result={updateAllRostersMutation.data}
        error={updateAllRostersMutation.error}
      />

      <RosterDialog
        open={Boolean(rosterTarget)}
        onClose={() => setRosterTarget(null)}
        teamId={rosterTarget?.teamId}
        teamName={rosterTarget?.teamName}
        leagueName={rosterTarget?.leagueName}
      />
    </Box>
  )
}
