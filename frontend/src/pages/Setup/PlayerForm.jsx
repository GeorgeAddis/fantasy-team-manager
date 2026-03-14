import { useEffect, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from '@/hooks/usePlayers'
import { useIrlFranchiseList } from '@/hooks/useIrlFranchises'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

const blank = {
  name: '',
  irl_franchise_id: null,
  week_rank: '',
  season_rank: '',
  position: '',
}

export default function PlayerForm({ mode, record, onSaved }) {
  const [fields, setFields] = useState(blank)
  const create = useCreatePlayer()
  const update = useUpdatePlayer()
  const remove = useDeletePlayer()
  const franchiseQuery = useIrlFranchiseList()
  const franchises = franchiseQuery.data?.data ?? []

  useEffect(() => {
    if (mode === 'edit' && record) {
      setFields({
        name: record.name ?? '',
        irl_franchise_id: record.irl_franchise_id ?? null,
        week_rank: record.week_rank ?? '',
        season_rank: record.season_rank ?? '',
        position: record.position ?? '',
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
      irl_franchise_id: fields.irl_franchise_id || null,
      week_rank: Number(fields.week_rank),
      season_rank: Number(fields.season_rank),
      position: fields.position,
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
    if (!window.confirm(`Delete player "${record.name}"?`)) return
    remove.mutate(record.id, { onSuccess: () => onSaved?.() })
  }

  const selectedFranchise =
    franchises.find((f) => f.id === fields.irl_franchise_id) ?? null

  if (mode === 'edit' && !record) {
    return (
      <Typography color="text.secondary">
        Select a player from the sidebar dropdown.
      </Typography>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {mode === 'create' ? 'New Player' : `Edit: ${record?.name}`}
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error?.body?.message || mutation.error?.message}
        </Alert>
      )}

      <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
        <TextField
          label="Player Name"
          name="name"
          value={fields.name}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          select
          label="Position"
          name="position"
          value={fields.position}
          onChange={handleChange}
          required
          fullWidth
        >
          {POSITIONS.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          options={franchises}
          getOptionLabel={(o) => `${o.name} (${o.abbreviated_name})`}
          value={selectedFranchise}
          onChange={(_, val) =>
            setFields((f) => ({ ...f, irl_franchise_id: val?.id ?? null }))
          }
          isOptionEqualToValue={(a, b) => a?.id === b?.id}
          renderInput={(params) => (
            <TextField {...params} label="IRL Franchise" />
          )}
        />
        <TextField
          label="Week Rank"
          name="week_rank"
          type="number"
          value={fields.week_rank}
          onChange={handleChange}
          required
          fullWidth
          inputProps={{ min: 0 }}
        />
        <TextField
          label="Season Rank"
          name="season_rank"
          type="number"
          value={fields.season_rank}
          onChange={handleChange}
          required
          fullWidth
          inputProps={{ min: 0 }}
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
