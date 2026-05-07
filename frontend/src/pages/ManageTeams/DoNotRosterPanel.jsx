import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ListAltIcon from '@mui/icons-material/ListAlt'
import SyncIcon from '@mui/icons-material/Sync'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PasteDataDialog from '@/components/PasteDataDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import RosterDialog from '@/components/RosterDialog'
import {
  useDoNotRosterList,
  useDoNotRosterTeams,
  useAddDoNotRoster,
  useRemoveDoNotRoster,
  useResetDoNotRoster,
} from '@/hooks/usePlayers'

const HEAD_CELL = { fontWeight: 700, color: 'text.secondary' }

export default function DoNotRosterPanel() {
  const { data: dnrData, isLoading: dnrLoading } = useDoNotRosterList()
  const { data: teamsData, isLoading: teamsLoading } = useDoNotRosterTeams()
  const addMutation = useAddDoNotRoster()
  const removeMutation = useRemoveDoNotRoster()
  const resetMutation = useResetDoNotRoster()

  const [addOpen, setAddOpen] = useState(false)
  const [addText, setAddText] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [rosterTarget, setRosterTarget] = useState(null)

  const players = dnrData?.data ?? []
  const teams = teamsData?.data ?? []

  function openAdd() {
    setAddText('')
    addMutation.reset()
    setAddOpen(true)
  }

  function closeAdd() {
    if (addMutation.isPending) return
    setAddOpen(false)
    setAddText('')
    addMutation.reset()
  }

  function handleAddSubmit() {
    if (!addText.trim()) return
    addMutation.mutate({ data: addText })
  }

  function handleResetConfirm() {
    resetMutation.mutate(undefined, {
      onSuccess: () => setResetOpen(false),
    })
  }

  function handleRemove(playerId) {
    removeMutation.mutate(playerId)
  }

  const addResult = addMutation.data

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
          Do Not Roster
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{ textTransform: 'none' }}
          >
            Add Players
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => setResetOpen(true)}
            disabled={players.length === 0}
            sx={{ textTransform: 'none' }}
          >
            Reset All
          </Button>
        </Box>
      </Box>

      {(dnrLoading || teamsLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!dnrLoading && !teamsLoading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
          {/* Left: DNR Players */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Do Not Roster Players ({players.length})
            </Typography>

            {players.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                No players flagged. Use the Add Players button to add players to this list.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEAD_CELL}>Player</TableCell>
                      <TableCell sx={HEAD_CELL}>Team</TableCell>
                      <TableCell sx={{ ...HEAD_CELL, textAlign: 'center' }}>Bye</TableCell>
                      <TableCell sx={{ ...HEAD_CELL, width: 48 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {players.map((p) => (
                      <TableRow key={p.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {p.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {p.irl_franchise_abbr ?? p.irl_franchise_name ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {p.bye_week ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', px: 0.5 }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(p.id)}
                            disabled={removeMutation.isPending}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Divider */}
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />

          {/* Right: Teams with DNR players */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Teams with DNR Players ({teams.length})
            </Typography>

            {teams.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                No teams currently roster any do-not-roster players.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEAD_CELL}>League</TableCell>
                      <TableCell sx={HEAD_CELL}>Roster</TableCell>
                      <TableCell sx={HEAD_CELL}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teams.map((t) => (
                      <TableRow key={t.team_id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {t.league_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ListAltIcon />}
                            onClick={() =>
                              setRosterTarget({
                                teamId: t.team_id,
                                teamName: t.team_name,
                                leagueName: t.league_name,
                              })
                            }
                            sx={{
                              textTransform: 'none',
                              bgcolor: 'primary.main',
                              '&:hover': { bgcolor: 'primary.dark' },
                            }}
                          >
                            View Roster
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SyncIcon />}
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
          </Box>
        </Box>
      )}

      {/* Add Players Dialog */}
      <PasteDataDialog
        open={addOpen}
        onClose={closeAdd}
        title="Add Do Not Roster Players"
        text={addText}
        onTextChange={setAddText}
        placeholder={'Patrick Mahomes\nJosh Allen\nLamar Jackson\n...'}
        onSubmit={handleAddSubmit}
        isPending={addMutation.isPending}
        submitDisabled={!addText.trim()}
        submitLabel="Add Players"
        submitIcon={<UploadFileIcon />}
        showSubmit={!addResult}
        closeLabel={addResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste player names below, one per line. Players will be matched and flagged as do-not-roster.
        </Typography>

        {addMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {addMutation.error?.body?.message || addMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {addResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Flagged {addResult.updated} player{addResult.updated !== 1 ? 's' : ''} out of {addResult.total_lines} entries.
            </Alert>

            {addResult.not_found?.length > 0 && (
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
                  Players not found ({addResult.not_found.length})
                </Typography>
                {addResult.not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.rank}: {p.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </PasteDataDialog>

      {/* Reset Confirmation */}
      <ConfirmDialog
        open={resetOpen}
        title="Reset Do Not Roster"
        message="Are you sure you want to clear the entire do-not-roster list? All players will be unflagged."
        confirmLabel="Reset All"
        confirmColor="error"
        onCancel={() => setResetOpen(false)}
        onConfirm={handleResetConfirm}
        isLoading={resetMutation.isPending}
      />

      {/* Roster Dialog */}
      <RosterDialog
        open={Boolean(rosterTarget)}
        onClose={() => setRosterTarget(null)}
        teamId={rosterTarget?.teamId}
        teamName={rosterTarget?.teamName}
        leagueName={rosterTarget?.leagueName}
      />
    </>
  )
}
