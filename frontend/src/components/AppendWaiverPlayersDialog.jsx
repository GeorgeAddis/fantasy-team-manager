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
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'

export default function AppendWaiverPlayersDialog({
  open,
  onClose,
  onAppend,
  isPending = false,
  result,
  error,
  scoringLabel,
}) {
  const first = result?.appended_players?.[0]?.rank
  const last = result?.appended_players?.[result.appended_players.length - 1]?.rank

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
        Append {scoringLabel} Waiver Players
      </DialogTitle>
      <DialogContent>
        {!result && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Adds every player on the {scoringLabel} overall waiver wire list to the end of the
            {' '}{scoringLabel} season rankings, in waiver order. Players who already hold a season
            rank are skipped. Position ranks continue from each position&apos;s current highest rank.
            Existing season ranks are not changed.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error?.body?.message || error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {result && (
          <Box>
            <Alert severity={result.appended > 0 ? 'success' : 'info'} sx={{ mb: 1.5 }}>
              {result.appended > 0
                ? `Appended ${result.appended} player${result.appended !== 1 ? 's' : ''} at ranks ${first}–${last}.`
                : 'Nothing to append.'}
              {' '}
              {result.skipped > 0
                ? `Skipped ${result.skipped} already ranked out of ${result.waiver_total} on the waiver list.`
                : `${result.waiver_total} on the waiver list.`}
            </Alert>

            {result.appended_players?.length > 0 && (
              <Box
                sx={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  mb: 1.5,
                  fontSize: '0.8rem',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  Appended ({result.appended_players.length})
                </Typography>
                {result.appended_players.map((p) => (
                  <Typography key={p.rank} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.rank}: {p.name}{p.position_rank ? ` (${p.position_rank})` : ''}
                  </Typography>
                ))}
              </Box>
            )}

            {result.skipped_players?.length > 0 && (
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
                  Already ranked, skipped ({result.skipped_players.length})
                </Typography>
                {result.skipped_players.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.season_rank}: {p.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={isPending} variant="text" color="inherit">
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <PlaylistAddIcon />}
            disabled={isPending}
            onClick={onAppend}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Append
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
