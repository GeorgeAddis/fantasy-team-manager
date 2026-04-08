import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

export default function ConfirmDialog({
  open,
  title = 'Confirm Delete',
  message,
  itemName,
  confirmLabel = 'Delete',
  confirmColor = 'error',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
  isLoading = false,
}) {
  const finalMessage =
    message ??
    `Are you sure you want to delete "${itemName ?? 'this item'}"? This action cannot be undone.`

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onCancel}
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
      <DialogTitle sx={{ fontWeight: 700, color: 'secondary.main' }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary' }}>{finalMessage}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} disabled={isLoading} variant="text" color="inherit">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          variant="contained"
          color={confirmColor}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
