import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ConfirmDialog from '@/components/ConfirmDialog'
import StorageIcon from '@mui/icons-material/Storage'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import {
  usePlayerList,
  usePlayerStats,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from '@/hooks/usePlayers'
import { useIrlFranchiseList } from '@/hooks/useIrlFranchises'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
const DEBOUNCE_MS = 800

const blank = {
  name: '',
  irl_franchise_id: null,
  week_rank: '',
  season_rank: '',
  positions: [],
}

export default function PlayerForm({ mode, record, onSaved }) {
  const [fields, setFields] = useState(blank)
  const [deleteOpen, setDeleteOpen] = useState(false)
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
        week_rank: record.week_rank != null && record.week_rank !== 999 ? record.week_rank : '',
        season_rank: record.season_rank != null && record.season_rank !== 999 ? record.season_rank : '',
        positions: Array.isArray(record.positions) ? record.positions : [],
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
      week_rank: fields.week_rank === '' ? null : Number(fields.week_rank),
      season_rank: fields.season_rank === '' ? null : Number(fields.season_rank),
      positions: fields.positions,
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

  const selectedFranchise =
    franchises.find((f) => f.id === fields.irl_franchise_id) ?? null

  if (mode === 'create') {
    return (
      <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
        <Box sx={{ flex: '0 0 420px', overflowY: 'auto' }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              New Player
            </Typography>

            {mutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {mutation.error?.body?.message || mutation.error?.message}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField label="Player Name" name="name" value={fields.name} onChange={handleChange} required fullWidth />
              <TextField
                select
                label="Position(s)"
                name="positions"
                value={fields.positions}
                onChange={(e) => setFields((f) => ({ ...f, positions: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))}
                required
                fullWidth
                slotProps={{ select: { multiple: true, renderValue: (sel) => sel.join(', ') } }}
              >
                {POSITIONS.map((p) => (
                  <MenuItem key={p} value={p}>
                    <Checkbox size="small" checked={fields.positions.includes(p)} sx={{ py: 0 }} />
                    <ListItemText primary={p} />
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                options={franchises}
                getOptionLabel={(o) => `${o.name} (${o.abbreviated_name})`}
                value={selectedFranchise}
                onChange={(_, val) => setFields((f) => ({ ...f, irl_franchise_id: val?.id ?? null }))}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={(params) => <TextField {...params} label="IRL Franchise" />}
              />
              <TextField label="Wk Rank" name="week_rank" type="number" value={fields.week_rank} onChange={handleChange} fullWidth inputProps={{ min: 0 }} helperText="Optional (defaults to unranked)" />
              <TextField label="Szn Rank" name="season_rank" type="number" value={fields.season_rank} onChange={handleChange} fullWidth inputProps={{ min: 0 }} helperText="Optional (defaults to unranked)" />
              <Button
                type="submit"
                variant="contained"
                startIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                disabled={isPending}
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                Create
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <PlayerTable franchises={franchises} update={update} remove={remove} />
      </Box>
    </Box>
  )
}

/* ─── Column layout ─── */

const COL = {
  name:    { flex: '1 1 0', minWidth: 70 },
  alt:     { flex: '0.7 1 0', minWidth: 50 },
  fantrax: { width: 88,  flexShrink: 0 },
  pos:     { width: 100,  flexShrink: 0 },
  team:    { width: 72,  flexShrink: 0 },
  wk:      { width: 64,  flexShrink: 0 },
  szn:     { width: 64,  flexShrink: 0 },
  actions: { width: 52,  flexShrink: 0 },
}

const INPUT_SX = {
  '& .MuiInput-root': { fontSize: '0.85rem' },
  '& .MuiInput-root::before': { bottom: 0 },
  '& .MuiInput-root::after': { bottom: 0 },
  '& .MuiSelect-select': { py: '2px' },
  '& .MuiInput-input': { py: '2px' },
}

const ROW_HEIGHT = 44

/* ─── PlayerTable ─── */

function PlayerTable({ franchises, update, remove }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const statsQuery = usePlayerStats()
  const stats = statsQuery.data

  const hasSearch = searchTerm !== ''
  const playerQuery = usePlayerList(
    hasSearch ? { search: searchTerm } : {},
    { enabled: hasSearch },
  )
  const players = hasSearch ? (playerQuery.data?.data ?? []) : []

  function submitSearch() {
    setSearchTerm(searchInput.trim())
  }

  function clearSearch() {
    setSearchInput('')
    setSearchTerm('')
  }

  const franchiseMap = useMemo(() => {
    const m = new Map()
    franchises.forEach((f) => m.set(f.id, f))
    return m
  }, [franchises])

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const fA = a.irl_franchise_id ? (a.irl_franchise_name ?? franchiseMap.get(a.irl_franchise_id)?.name ?? '') : null
      const fB = b.irl_franchise_id ? (b.irl_franchise_name ?? franchiseMap.get(b.irl_franchise_id)?.name ?? '') : null
      if (fA === null && fB !== null) return 1
      if (fA !== null && fB === null) return -1
      if (fA !== fB) return (fA ?? '').localeCompare(fB ?? '')
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
  }, [players, franchiseMap])

  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  const lastImportDate = stats?.last_import
    ? new Date(stats.last_import).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <>
      {/* Search bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search players..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitSearch() }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={submitSearch} edge="end">
                  {hasSearch && playerQuery.isFetching ? <CircularProgress size={16} /> : <SearchIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 320 }}
        />
      </Box>

      {/* Player stats summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <StorageIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2">
            <strong>{stats?.total ?? '—'}</strong> players stored
          </Typography>
        </Box>
        {lastImportDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CalendarTodayIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2">
              Last import: <strong>{lastImportDate}</strong>
            </Typography>
          </Box>
        )}
      </Box>

      {/* Search results */}
      {hasSearch && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Results for "{searchTerm}" ({sorted.length}{playerQuery.data?.meta?.total != null && sorted.length < playerQuery.data.meta.total ? ` / ${playerQuery.data.meta.total}` : ''})
            </Typography>
            <Button size="small" onClick={clearSearch} sx={{ textTransform: 'none', ml: 'auto' }}>
              Clear search
            </Button>
          </Box>

          {sorted.length > 0 && (
            <>
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.75,
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                <Box sx={COL.name}>Name</Box>
                <Box sx={COL.alt}>Alt Name</Box>
                <Box sx={COL.fantrax}>Fantrax ID</Box>
                <Box sx={COL.pos}>Position</Box>
                <Box sx={COL.team}>Team</Box>
                <Box sx={COL.wk}>Wk Rank</Box>
                <Box sx={COL.szn}>Szn Rank</Box>
                <Box sx={COL.actions} />
              </Box>

              {/* Virtualized body */}
              <Box ref={parentRef} sx={{ flex: 1, overflow: 'auto' }}>
                <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vRow) => {
                    const player = sorted[vRow.index]
                    return (
                      <LivePlayerRow
                        key={player.id}
                        player={player}
                        franchises={franchises}
                        franchiseMap={franchiseMap}
                        update={update}
                        remove={remove}
                        onRequestDelete={setDeleteTarget}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${vRow.size}px`,
                          transform: `translateY(${vRow.start}px)`,
                        }}
                      />
                    )
                  })}
                </Box>
              </Box>
            </>
          )}

          {sorted.length === 0 && !playerQuery.isFetching && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No players match "{searchTerm}".
            </Typography>
          )}
        </>
      )}

      {!hasSearch && (
        <Typography variant="body2" color="text.secondary">
          Use the search bar to find and edit players.
        </Typography>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Player"
        itemName={deleteTarget?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        isLoading={remove.isPending}
      />
    </>
  )
}

/* ─── LivePlayerRow ─── */

const LivePlayerRow = memo(function LivePlayerRow({
  player,
  franchises,
  franchiseMap,
  update,
  remove,
  onRequestDelete,
  style,
}) {
  const [local, setLocal] = useState(() => rowFromPlayer(player))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timers = useRef({})
  const localRef = useRef(local)
  localRef.current = local
  const pendingRef = useRef(false)

  useEffect(() => {
    setLocal(rowFromPlayer(player))
  }, [player])

  const persist = useCallback(
    (overrides = {}) => {
      const cur = { ...localRef.current, ...overrides }
      const payload = {
        id: player.id,
        name: cur.name,
        alternate_name: cur.alternate_name || null,
        fantrax_id: cur.fantrax_id || null,
        positions: cur.positions,
        irl_franchise_id: cur.irl_franchise_id || null,
        week_rank: cur.week_rank === '' ? null : Number(cur.week_rank),
        season_rank: cur.season_rank === '' ? null : Number(cur.season_rank),
      }
      setSaving(true)
      setSaved(false)
      pendingRef.current = false
      update.mutate(payload, {
        onSettled: () => setSaving(false),
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        },
      })
    },
    [player.id, update],
  )

  const persistRef = useRef(persist)
  persistRef.current = persist

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      if (pendingRef.current) persistRef.current()
    }
  }, [])

  function handleText(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }))
    pendingRef.current = true
    clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(() => persist({ [field]: value }), DEBOUNCE_MS)
  }

  function handleSelect(field, value) {
    setLocal((prev) => ({ ...prev, [field]: value }))
    persist({ [field]: value })
  }

  function handleBlur(field) {
    if (!pendingRef.current) return
    clearTimeout(timers.current[field])
    persist()
  }

  return (
    <Box
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: remove.isPending ? 0.4 : 1,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ ...COL.name, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          value={local.name}
          onChange={(e) => handleText('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          fullWidth
          sx={INPUT_SX}
        />
      </Box>

      <Box sx={{ ...COL.alt, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          value={local.alternate_name}
          onChange={(e) => handleText('alternate_name', e.target.value)}
          onBlur={() => handleBlur('alternate_name')}
          fullWidth
          placeholder="—"
          sx={INPUT_SX}
        />
      </Box>

      <Box sx={{ ...COL.fantrax, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          value={local.fantrax_id}
          onChange={(e) => handleText('fantrax_id', e.target.value)}
          onBlur={() => handleBlur('fantrax_id')}
          fullWidth
          placeholder="—"
          sx={INPUT_SX}
        />
      </Box>

      <Box sx={{ ...COL.pos, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          select
          value={local.positions}
          onChange={(e) => {
            const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
            if (val.length > 0) handleSelect('positions', val)
          }}
          fullWidth
          sx={INPUT_SX}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (sel) => sel.join(', '),
            },
          }}
        >
          {POSITIONS.map((p) => (
            <MenuItem key={p} value={p} dense>{p}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ ...COL.team, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          select
          value={local.irl_franchise_id ?? ''}
          onChange={(e) => handleSelect('irl_franchise_id', e.target.value || null)}
          fullWidth
          sx={INPUT_SX}
        >
          <MenuItem value="" dense><em>FA</em></MenuItem>
          {franchises.map((f) => (
            <MenuItem key={f.id} value={f.id} dense>{f.abbreviated_name}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ ...COL.wk, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          type="number"
          value={local.week_rank}
          onChange={(e) => handleText('week_rank', e.target.value)}
          onBlur={() => handleBlur('week_rank')}
          fullWidth
          inputProps={{ min: 0 }}
          sx={INPUT_SX}
        />
      </Box>

      <Box sx={{ ...COL.szn, pr: 0.5 }}>
        <TextField
          variant="standard"
          size="small"
          type="number"
          value={local.season_rank}
          onChange={(e) => handleText('season_rank', e.target.value)}
          onBlur={() => handleBlur('season_rank')}
          fullWidth
          inputProps={{ min: 0 }}
          sx={INPUT_SX}
        />
      </Box>

      <Box sx={{ ...COL.actions, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {saving && <CircularProgress size={14} sx={{ mr: 0.25 }} />}
        {saved && <CheckCircleIcon color="success" sx={{ fontSize: 14, mr: 0.25 }} />}
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={() => onRequestDelete(player)}
            disabled={remove.isPending}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
})

function rowFromPlayer(p) {
  return {
    name: p.name ?? '',
    alternate_name: p.alternate_name ?? '',
    fantrax_id: p.fantrax_id ?? '',
    positions: Array.isArray(p.positions) ? p.positions : [],
    irl_franchise_id: p.irl_franchise_id ?? '',
    week_rank: p.week_rank != null && p.week_rank !== 999 ? p.week_rank : '',
    season_rank: p.season_rank != null && p.season_rank !== 999 ? p.season_rank : '',
  }
}
