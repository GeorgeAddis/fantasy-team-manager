import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

/**
 * Shows loading / success / error for a Fantrax roster sync.
 * result: single-league shape { teams_matched, slots_created, ... }
 *   or bulk shape { leagues_updated, leagues_failed, leagues: [...] }
 */
export default function RosterUpdateResultDialog({
  open,
  onClose,
  title,
  isPending,
  result,
  error,
  bulk = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: 'secondary.main' }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {isPending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2" color="text.secondary">
              Fetching rosters from Fantrax…
            </Typography>
          </Box>
        )}

        {error && !isPending && (
          <Alert severity="error">
            {error?.body?.message || error?.message || 'Roster update failed.'}
          </Alert>
        )}

        {result && !isPending && !bulk && (
          <Box>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {result.teams_matched} team{result.teams_matched !== 1 ? 's' : ''} —{' '}
              {result.slots_created} lineup slot{result.slots_created !== 1 ? 's' : ''} created
              {result.period != null ? ` (period ${result.period})` : ''}.
            </Alert>

            {result.teams_not_found?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Teams not matched: {result.teams_not_found.join(', ')}
              </Alert>
            )}

            {result.players_not_found?.length > 0 && (
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  Players not found ({result.players_not_found.length})
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

        {result && !isPending && bulk && (
          <Box>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {result.leagues_updated} league{result.leagues_updated !== 1 ? 's' : ''}
              {result.leagues_failed > 0 ? ` (${result.leagues_failed} failed)` : ''} —{' '}
              {result.slots_created} lineup slots across {result.teams_matched} teams.
            </Alert>

            {Array.isArray(result.leagues) && result.leagues.some((l) => l.error) && (
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  mb: 1,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  Failed leagues
                </Typography>
                {result.leagues.filter((l) => l.error).map((l) => (
                  <Typography key={l.league_id} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    {l.league_name}: {l.error}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={isPending} variant="contained" color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
