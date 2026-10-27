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
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'

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
  const [applyBoth, setApplyBoth] = useState(true)
  const [append, setAppend] = useState(false)
  const inputRef = useRef(null)

  function handleFileChange(e) {
    setFile(e.target.files?.[0] ?? null)
    if (e.target.files?.[0]) setPasteText('')
  }

  function handleClose() {
    if (isLoading) return
    setFile(null)
    setPasteText('')
    setApplyBoth(true)
    setAppend(false)
    onClose()
  }

  function handleImport() {
    if (file) {
      onImport({ file, apply_both: applyBoth, append })
      return
    }
    if (pasteText.trim()) {
      onImport({ data: pasteText, apply_both: applyBoth, append })
    }
  }

  const canSubmit = Boolean(file) || Boolean(pasteText.trim())
  const locked = isLoading || Boolean(result)
  const isAppendResult = result?.mode === 'append'
  const firstAppended = result?.appended_players?.[0]?.rank
  const lastAppended = result?.appended_players?.[result.appended_players.length - 1]?.rank

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
          Upload a CSV with <strong>Player</strong> and <strong>Rank</strong> (or ETR Rank / 1QB Rank).
          Helpful extras: <strong>Pos</strong>, <strong>Team</strong>, and <strong>PosRank</strong>
          {' '}(or ETR Pos Rank). Or paste player names below, one per line, in rank order.
          Position rank is used when present; otherwise it is derived from overall rank within each position.
        </DialogContentText>

        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={applyBoth}
                onChange={(e) => setApplyBoth(e.target.checked)}
                color="secondary"
                disabled={locked}
              />
            }
            label="Apply the same ranks to PPR and Non-PPR"
            sx={{ '& .MuiTypography-root': { fontSize: '0.875rem' } }}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={append}
                onChange={(e) => setAppend(e.target.checked)}
                color="secondary"
                disabled={locked}
              />
            }
            label="Append to the bottom of existing rankings"
            sx={{ '& .MuiTypography-root': { fontSize: '0.875rem' } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {append
              ? 'Players are added after the current last season rank, in list order. Rank numbers in the list are ignored and players who already hold a season rank are skipped.'
              : 'All existing season ranks are cleared before the list is written.'}
          </Typography>
        </Box>

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
          Or paste player names, one per line (line order = rank)
        </Typography>
        <TextField
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value)
            if (e.target.value) setFile(null)
          }}
          placeholder={"Jahmyr Gibbs\nJa'Marr Chase\nLamar Jackson\n..."}
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
            {isAppendResult ? (
              <Alert severity={result.appended > 0 ? 'success' : 'info'} sx={{ mb: 1.5 }}>
                {result.appended > 0
                  ? `Appended ${result.appended} player${result.appended !== 1 ? 's' : ''} at ranks ${firstAppended}–${lastAppended} out of ${result.total_lines} rows.`
                  : `Nothing to append out of ${result.total_lines} rows.`}
                {result.skipped > 0 && ` Skipped ${result.skipped} already ranked.`}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Reset all season ranks, then updated {result.updated} player{result.updated !== 1 ? 's' : ''} out of {result.total_lines} rows.
              </Alert>
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
                  mb: 1.5,
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
                    #{p.rank}: {p.name}{p.position ? ` (${p.position})` : ''}
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
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : append ? <PlaylistAddIcon /> : <UploadFileIcon />}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            {append ? 'Append' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
