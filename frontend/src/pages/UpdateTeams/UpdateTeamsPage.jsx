import { useMemo, useState } from 'react'
import {
  Alert,
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
import { useLeagueList, useUpdateRosters } from '@/hooks/useLeagues'
import PasteDataDialog from '@/components/PasteDataDialog'

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
  const [rosterText, setRosterText] = useState('')
  const rosterMutation = useUpdateRosters()

  const sorted = useMemo(() => {
    return [...leagues].sort((a, b) => {
      if (!a.teams_updated_at && !b.teams_updated_at) return 0
      if (!a.teams_updated_at) return -1
      if (!b.teams_updated_at) return 1
      return new Date(a.teams_updated_at) - new Date(b.teams_updated_at)
    })
  }, [leagues])

  function openDialog(league) {
    setUpdateTarget(league)
    setRosterText('')
    rosterMutation.reset()
  }

  function closeDialog() {
    if (rosterMutation.isPending) return
    setUpdateTarget(null)
    setRosterText('')
    rosterMutation.reset()
  }

  function handleSubmit() {
    if (!updateTarget || !rosterText.trim()) return
    rosterMutation.mutate({ leagueId: updateTarget.id, data: rosterText })
  }

  const result = rosterMutation.data

  return (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography variant="h5" gutterBottom color="secondary.main">
        Update Teams
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Trigger roster updates for each of your leagues.
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
            maxWidth: 680,
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
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} align="left">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((league) => (
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
                  <TableCell align="left">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SyncIcon />}
                      onClick={() => openDialog(league)}
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PasteDataDialog
        open={Boolean(updateTarget)}
        onClose={closeDialog}
        title={`Update Rosters — ${updateTarget?.name ?? ''}`}
        text={rosterText}
        onTextChange={setRosterText}
        placeholder={'TeamName\nQB\nPlayer One\nPlayer Two\nRB\nPlayer Three\n...'}
        onSubmit={handleSubmit}
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
    </Box>
  )
}
