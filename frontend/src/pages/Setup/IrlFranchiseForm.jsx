import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  useIrlFranchiseList,
  useCreateIrlFranchise,
  useUpdateIrlFranchise,
  useDeleteIrlFranchise,
} from '@/hooks/useIrlFranchises'

const blank = {
  name: '',
  abbreviated_name: '',
  alternate_name: '',
  alternate_abbreviated_name: '',
  bye_week: '',
}

const DEBOUNCE_MS = 800

export default function IrlFranchiseForm({ mode, record, onSaved }) {
  const [fields, setFields] = useState(blank)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const create = useCreateIrlFranchise()
  const update = useUpdateIrlFranchise()
  const remove = useDeleteIrlFranchise()
  const franchiseQuery = useIrlFranchiseList()
  const franchises = franchiseQuery.data?.data ?? []

  useEffect(() => {
    if (mode === 'edit' && record) {
      setFields({
        name: record.name ?? '',
        abbreviated_name: record.abbreviated_name ?? '',
        alternate_name: record.alternate_name ?? '',
        alternate_abbreviated_name: record.alternate_abbreviated_name ?? '',
        bye_week: record.bye_week ?? '',
      })
    } else {
      setFields(blank)
    }
  }, [mode, record])

  const mutation = mode === 'create' ? create : update
  const isPending = mutation.isPending || remove.isPending

  function handleChange(e) {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function buildPayload() {
    return {
      name: fields.name,
      abbreviated_name: fields.abbreviated_name,
      alternate_name: fields.alternate_name || null,
      alternate_abbreviated_name: fields.alternate_abbreviated_name || null,
      bye_week: fields.bye_week ? Number(fields.bye_week) : null,
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = buildPayload()
    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: () => {
          setFields(blank)
          onSaved?.()
        },
      })
    } else if (record) {
      update.mutate({ id: record.id, ...payload }, { onSuccess: () => onSaved?.() })
    }
  }

  function handleDelete() {
    if (!record) return
    remove.mutate(record.id, { onSuccess: () => onSaved?.() })
  }

  if (mode === 'edit') {
    return (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FranchiseTable
          franchises={franchises}
          update={update}
          remove={remove}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
      {/* Left: create / edit form */}
      <Box sx={{ flex: '0 0 380px' }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {mode === 'create' ? 'New IRL Franchise' : `Edit: ${record?.name}`}
          </Typography>

          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {mutation.error?.body?.message || mutation.error?.message}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              label="Name"
              name="name"
              value={fields.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Abbreviation"
              name="abbreviated_name"
              value={fields.abbreviated_name}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ maxLength: 32 }}
            />
            <TextField
              label="Alternate Name"
              name="alternate_name"
              value={fields.alternate_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Alt. Abbreviation"
              name="alternate_abbreviated_name"
              value={fields.alternate_abbreviated_name}
              onChange={handleChange}
              fullWidth
              inputProps={{ maxLength: 32 }}
            />
            <TextField
              label="Bye Week"
              name="bye_week"
              type="number"
              value={fields.bye_week}
              onChange={handleChange}
              fullWidth
              inputProps={{ min: 1, max: 18 }}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {mode === 'edit' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={remove.isPending ? <CircularProgress size={18} /> : <DeleteIcon />}
                  onClick={() => setDeleteOpen(true)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                startIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                disabled={isPending}
                sx={{
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Right: live-editable table of saved franchises */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FranchiseTable
          franchises={franchises}
          update={update}
          remove={remove}
        />
      </Box>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete IRL Franchise"
        itemName={record?.name}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          handleDelete()
          setDeleteOpen(false)
        }}
        isLoading={remove.isPending}
      />
    </Box>
  )
}

const TABLE_COLS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'abbreviated_name', label: 'Abbr', required: true, maxLen: 32 },
  { key: 'alternate_name', label: 'Alt Name' },
  { key: 'alternate_abbreviated_name', label: 'Alt Abbr', maxLen: 32 },
  { key: 'bye_week', label: 'Bye', type: 'number', min: 1, max: 18 },
]

function FranchiseTable({ franchises, update, remove }) {
  const [deleteTarget, setDeleteTarget] = useState(null)

  if (franchises.length === 0) {
    return (
      <Box sx={{ mt: 5, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No franchises yet. Create one using the form.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Saved Franchises ({franchises.length})
      </Typography>
      <TableContainer sx={{ maxHeight: '100%' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {TABLE_COLS.map((c) => (
                <TableCell
                  key={c.key}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {c.label}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 700, width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {franchises.map((f) => (
              <LiveRow
                key={f.id}
                franchise={f}
                update={update}
                remove={remove}
                onRequestDelete={(row) => setDeleteTarget(row)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete IRL Franchise"
        itemName={deleteTarget?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        isLoading={remove.isPending}
      />
    </Box>
  )
}

function LiveRow({ franchise, update, remove, onRequestDelete }) {
  const [local, setLocal] = useState(() => rowFromFranchise(franchise))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timers = useRef({})

  useEffect(() => {
    setLocal(rowFromFranchise(franchise))
  }, [franchise])

  const persist = useCallback(
    (field, value) => {
      const payload = {
        id: franchise.id,
        name: field === 'name' ? value : (local.name || franchise.name),
        abbreviated_name:
          field === 'abbreviated_name'
            ? value
            : (local.abbreviated_name || franchise.abbreviated_name),
        alternate_name:
          field === 'alternate_name' ? (value || null) : (local.alternate_name || null),
        alternate_abbreviated_name:
          field === 'alternate_abbreviated_name'
            ? (value || null)
            : (local.alternate_abbreviated_name || null),
        bye_week:
          field === 'bye_week'
            ? (value ? Number(value) : null)
            : (local.bye_week ? Number(local.bye_week) : null),
      }
      setSaving(true)
      setSaved(false)
      update.mutate(payload, {
        onSettled: () => setSaving(false),
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        },
      })
    },
    [franchise, local, update],
  )

  function handleChange(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }))
    clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(() => persist(field, value), DEBOUNCE_MS)
  }

  function handleBlur(field) {
    clearTimeout(timers.current[field])
    persist(field, local[field])
  }

  return (
    <TableRow
      sx={{
        '&:last-child td': { borderBottom: 0 },
        opacity: remove.isPending ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {TABLE_COLS.map((col) => (
        <TableCell key={col.key} sx={{ py: 0.5, px: 0.75 }}>
          <TextField
            variant="standard"
            size="small"
            value={local[col.key]}
            onChange={(e) => handleChange(col.key, e.target.value)}
            onBlur={() => handleBlur(col.key)}
            type={col.type ?? 'text'}
            required={col.required}
            inputProps={{
              maxLength: col.maxLen,
              min: col.min,
              max: col.max,
              style: { fontSize: '0.85rem', padding: '2px 0' },
            }}
            fullWidth
            sx={{ minWidth: col.key === 'bye_week' ? 48 : 80 }}
          />
        </TableCell>
      ))}
      <TableCell sx={{ py: 0.5, px: 0.5, whiteSpace: 'nowrap' }}>
        {saving && <CircularProgress size={16} sx={{ mr: 0.5 }} />}
        {saved && (
          <CheckCircleIcon
            color="success"
            sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }}
          />
        )}
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={() => onRequestDelete(franchise)}
            disabled={remove.isPending}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  )
}

function rowFromFranchise(f) {
  return {
    name: f.name ?? '',
    abbreviated_name: f.abbreviated_name ?? '',
    alternate_name: f.alternate_name ?? '',
    alternate_abbreviated_name: f.alternate_abbreviated_name ?? '',
    bye_week: f.bye_week ?? '',
  }
}
