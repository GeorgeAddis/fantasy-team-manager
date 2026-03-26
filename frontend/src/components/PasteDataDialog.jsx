import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import SyncIcon from '@mui/icons-material/Sync'

export default function PasteDataDialog({
  open,
  onClose,
  title,
  onSubmit,
  isPending = false,
  submitDisabled = false,
  submitLabel = 'Update',
  submitIcon,
  showSubmit = true,
  closeLabel,
  text,
  onTextChange,
  placeholder,
  children,
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
        {children}

        <TextField
          multiline
          minRows={8}
          maxRows={15}
          fullWidth
          placeholder={placeholder}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={isPending}
          sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          disabled={isPending}
          variant="text"
          color="inherit"
        >
          {closeLabel || 'Cancel'}
        </Button>
        {showSubmit && (
          <Button
            variant="contained"
            startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : (submitIcon ?? <SyncIcon />)}
            disabled={isPending || submitDisabled}
            onClick={onSubmit}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {submitLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
