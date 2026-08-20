import { useRef, useState } from 'react'
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
  TextField,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'

export default function ImportSeasonRankingsDialog({
  open,
  onClose,
  onImport,
  isLoading,
  result,
  error,
  title = 'Import Season Rankings',
}) {
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const inputRef = useRef(null)

  function handleFileChange(e) {
    setFile(e.target.files?.[0] ?? null)
    if (e.target.files?.[0]) setPasteText('')
  }

  function handleClose() {
    if (isLoading) return
    setFile(null)
    setPasteText('')
    onClose()
  }

  function handleImport() {
    if (file) {
      onImport({ file })
      return
    }
    if (pasteText.trim()) {
      onImport({ data: pasteText })
    }
  }

  const canSubmit = Boolean(file) || Boolean(pasteText.trim())

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <DialogContentText sx={{ color: 'text.secondary', mb: 2 }}>
          Upload an ETR CSV with <strong>Player</strong>, <strong>ETR Rank</strong>, and ideally{' '}
          <strong>Position</strong>, <strong>Team</strong>, and <strong>ETR Pos Rank</strong>.
          Position rank is used when present; otherwise it is derived from overall rank within each position.
        </DialogContentText>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <Box
          onClick={() => !isLoading && inputRef.current?.click()}
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

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1 }}>
          Or paste CSV / tab-separated data
        </Typography>
        <TextField
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value)
            if (e.target.value) setFile(null)
          }}
          placeholder={"Player,Position,Team,ETR Rank,...,ETR Pos Rank\nJahmyr Gibbs,RB,DET,1,...,RB01"}
          multiline
          minRows={5}
          fullWidth
          disabled={isLoading || Boolean(result)}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.8rem',
            },
          }}
        />

        {result && !error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Reset all season ranks, then updated {result.updated} player{result.updated !== 1 ? 's' : ''} out of {result.total_lines} rows.
            </Alert>
            {result.not_found?.length > 0 && (
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
                  Players not found ({result.not_found.length})
                </Typography>
                {result.not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.rank}: {p.name} ({p.position})
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error?.body?.message || error?.message || 'Import failed.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isLoading} variant="text" color="inherit">
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            onClick={handleImport}
            disabled={isLoading || !canSubmit}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
