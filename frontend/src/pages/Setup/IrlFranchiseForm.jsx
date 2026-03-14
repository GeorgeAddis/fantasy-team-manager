import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import {
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

export default function IrlFranchiseForm({ mode, record, onSaved }) {
  const [fields, setFields] = useState(blank)
  const create = useCreateIrlFranchise()
  const update = useUpdateIrlFranchise()
  const remove = useDeleteIrlFranchise()

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
    if (!window.confirm(`Delete franchise "${record.name}"?`)) return
    remove.mutate(record.id, { onSuccess: () => onSaved?.() })
  }

  if (mode === 'edit' && !record) {
    return (
      <Typography color="text.secondary">
        Select a franchise from the sidebar dropdown.
      </Typography>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {mode === 'create' ? 'New IRL Franchise' : `Edit: ${record?.name}`}
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error?.body?.message || mutation.error?.message}
        </Alert>
      )}

      <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
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
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
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
  )
}
