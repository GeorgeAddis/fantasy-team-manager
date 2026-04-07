import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'
import DownloadingIcon from '@mui/icons-material/Downloading'

export default function ImportFantraxIdsDialog({ open, onClose, onImport, isLoading, result, error }) {
  function handleClose() {
    if (isLoading) return
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
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
        Import Fantrax IDs
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
          Fetches player data from the Fantrax API and matches to players in your database by
          name and position. Matched players will have their Fantrax ID saved.
        </DialogContentText>

        {result && !error && (
          <>
            <Alert severity="success" sx={{ mt: 1 }}>
              Updated {result.updated} player{result.updated !== 1 ? 's' : ''} with Fantrax IDs.
              {result.unmatched_count > 0 &&
                ` ${result.unmatched_count} player${result.unmatched_count !== 1 ? 's' : ''} could not be matched.`}
            </Alert>

            {Array.isArray(result.unmatched) && result.unmatched.length > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary' }}>
                  Players without a Fantrax ID (name | positions)
                </Typography>
                {result.unmatched.map((p) => (
                  <Typography
                    key={p.id}
                    variant="caption"
                    sx={{ display: 'block', fontFamily: 'monospace' }}
                  >
                    {p.name} | {Array.isArray(p.positions) ? p.positions.join(', ') : p.positions}
                  </Typography>
                ))}
                {result.unmatched_count > result.unmatched.length && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    ...and {result.unmatched_count - result.unmatched.length} more.
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error?.body?.message || error?.message || 'Import failed.'}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isLoading} variant="text" color="inherit">
          {result ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={onImport}
          disabled={isLoading || !!result}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadingIcon />}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          {isLoading ? 'Importing…' : 'Run Import'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
