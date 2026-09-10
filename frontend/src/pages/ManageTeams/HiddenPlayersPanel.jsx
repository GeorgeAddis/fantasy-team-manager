import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  useAddFaAlertHidden,
  useFaAlertHiddenList,
  useRemoveFaAlertHidden,
} from '@/hooks/usePlayers'

const HEADER_SX = {
  fontWeight: 700,
  color: 'text.secondary',
  fontSize: '0.7rem',
}

const CELL_SX = {
  fontSize: '0.8rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const COL_SX = {
  textAlign: 'right',
  fontFamily: 'monospace',
}

const GRID_COLS = '1fr repeat(4, 72px) 48px'

function posPrefix(positions) {
  const pos = positions?.[0] ?? ''
  return pos === 'DST' ? 'D' : pos
}

function formatPosRank(positions, rank) {
  if (rank == null || rank >= 999) return '—'
  return `${posPrefix(positions)}${rank}`
}

function formatRank(rank) {
  if (rank == null || rank >= 999) return '—'
  return rank
}

export default function HiddenPlayersPanel({ onBack }) {
  const { data, isLoading, isError, error } = useFaAlertHiddenList()
  const addMutation = useAddFaAlertHidden()
  const removeMutation = useRemoveFaAlertHidden()
  const [input, setInput] = useState('')

  const players = data?.data ?? []
  const addResult = addMutation.data

  function handleAdd() {
    if (!input.trim()) return
    addMutation.mutate(
      { data: input },
      {
        onSuccess: () => setInput(''),
      },
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ textTransform: 'none' }}
        >
          Back
        </Button>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'text.primary' }}>
          Hidden Players
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These players are excluded from Free Agent Alerts. Paste names one per line, or separate them with commas.
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!isLoading && isError && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error?.body?.message || error?.message || 'Could not load hidden players.'}
        </Typography>
      )}

      {!isLoading && !isError && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLS,
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography sx={HEADER_SX}>Name</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Pos</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SZN</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>SPos</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }}>Bye</Typography>
            <Typography sx={{ ...HEADER_SX, textAlign: 'right' }} />
          </Box>

          {players.length === 0 && (
            <Typography color="text.secondary" sx={{ px: 1.5, py: 2, fontSize: '0.85rem' }}>
              No hidden players. Add names below to keep them off Free Agent Alerts.
            </Typography>
          )}

          {players.map((player) => (
            <Box
              key={player.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={CELL_SX}>{player.name}</Typography>
              <Typography variant="body2" sx={{ ...CELL_SX, ...COL_SX, color: 'text.secondary' }}>
                {(player.positions ?? []).join('/')}
              </Typography>
              <Typography variant="caption" sx={{ ...COL_SX, color: '#fff' }}>
                {formatRank(player.season_rank)}
              </Typography>
              <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                {formatPosRank(player.positions, player.season_position_rank)}
              </Typography>
              <Typography variant="caption" sx={{ ...COL_SX, color: 'text.secondary' }}>
                {player.bye_week ?? '—'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeMutation.mutate(player.id)}
                  disabled={removeMutation.isPending}
                  aria-label={`Remove ${player.name}`}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (addMutation.data || addMutation.error) addMutation.reset()
          }}
          placeholder={'Patrick Mahomes\nJosh Allen'}
          disabled={addMutation.isPending}
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!input.trim() || addMutation.isPending}
          sx={{ textTransform: 'none', minWidth: 88, mt: 0.25 }}
        >
          {addMutation.isPending ? 'Adding…' : 'Add'}
        </Button>
      </Box>

      {addMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {addMutation.error?.body?.message || addMutation.error?.message || 'Something went wrong.'}
        </Alert>
      )}

      {addResult && (
        <Box sx={{ mt: 2 }}>
          <Alert severity={addResult.not_found?.length ? 'warning' : 'success'} sx={{ mb: addResult.not_found?.length ? 1.5 : 0 }}>
            Added {addResult.updated} player{addResult.updated !== 1 ? 's' : ''} out of {addResult.total_lines}{' '}
            {addResult.total_lines === 1 ? 'name' : 'names'}.
          </Alert>

          {addResult.not_found?.length > 0 && (
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
                Players not found ({addResult.not_found.length})
              </Typography>
              {addResult.not_found.map((p, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  #{p.rank}: {p.name}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
