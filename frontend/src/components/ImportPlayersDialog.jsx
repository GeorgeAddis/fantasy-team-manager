import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

export default function ImportPlayersDialog({ open, onClose, onImport, isLoading, result, error }) {
  const [file, setFile] = useState(null)
  const [clearExisting, setClearExisting] = useState(false)
  const [skipExisting, setSkipExisting] = useState(true)
  const inputRef = useRef(null)

  function handleFileChange(e) {
    setFile(e.target.files?.[0] ?? null)
  }

  function handleClose() {
    if (isLoading) return
    setFile(null)
    onClose()
  }

  function handleClearExistingChange(e) {
    setClearExisting(e.target.checked)
    if (e.target.checked) setSkipExisting(false)
  }

  function handleSkipExistingChange(e) {
    setSkipExisting(e.target.checked)
    if (e.target.checked) setClearExisting(false)
  }

  function handleImport() {
    if (!file) return
    onImport(file, clearExisting, skipExisting)
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
        Import Players
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
          Upload a CSV file with <strong>Player</strong>, <strong>Team</strong>, and{' '}
          <strong>Position</strong> columns. Team should use the franchise abbreviation.
        </DialogContentText>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: file ? 'secondary.main' : 'divider',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: isLoading ? 'default' : 'pointer',
            transition: 'border-color 0.2s, background-color 0.2s',
            bgcolor: file ? 'rgba(212,165,116,0.06)' : 'transparent',
            '&:hover': isLoading
              ? {}
              : { borderColor: 'secondary.main', bgcolor: 'rgba(212,165,116,0.04)' },
          }}
        >
          {file ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <InsertDriveFileIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="body2" fontWeight={600}>{file.name}</Typography>
            </Box>
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                Click to select a CSV file
              </Typography>
            </>
          )}
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={skipExisting}
              onChange={handleSkipExistingChange}
              color="secondary"
              disabled={isLoading}
            />
          }
          label="Skip players that already exist (import new only)"
          sx={{ mt: 1.5, display: 'block', '& .MuiTypography-root': { fontSize: '0.875rem' } }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={clearExisting}
              onChange={handleClearExistingChange}
              color="secondary"
              disabled={isLoading}
            />
          }
          label="Clear all existing players before import"
          sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.875rem' } }}
        />

        {result && !error && (
          <>
            <Alert severity="success" sx={{ mt: 1.5 }}>
              Imported {result.imported} player{result.imported !== 1 ? 's' : ''}
              {result.skipped > 0 && ` (${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped)`}
              {result.cleared != null && result.cleared > 0 && ` — ${result.cleared} previous player${result.cleared !== 1 ? 's' : ''} removed`}.
            </Alert>
            {Array.isArray(result.failed_rows) && result.failed_rows.length > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1,
                  fontSize: '0.8rem',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: 'text.secondary' }}>
                  Skipped rows (row, player, team, position, reason)
                </Typography>
                {result.failed_rows.map((r, i) => (
                  <Typography key={`${r.row}-${i}`} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    {r.row}: {r.name || '[blank]'} | {r.team || '[blank]'} | {r.position || '[blank]'} | {r.reason}
                  </Typography>
                ))}
                {result.skipped > result.failed_rows.length && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    ...and {result.skipped - result.failed_rows.length} more skipped rows.
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error?.body?.message || error?.message || 'Import failed.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isLoading} variant="text" color="inherit">
          {result ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleImport}
          disabled={isLoading || !file}
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}
