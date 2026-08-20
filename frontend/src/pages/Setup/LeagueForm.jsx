import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  useImportFantraxLeague,
  useUpdateLeague,
  useDeleteLeague,
} from '@/hooks/useLeagues'
import {
  useCreateTeam,
  useUpdateTeam,
} from '@/hooks/useTeams'

const TEAM_COUNT = 12

function makeBlankTeams() {
  return Array.from({ length: TEAM_COUNT }, () => ({
    name: '',
    my_team: false,
    _id: null,
  }))
}

function isGamtgomt(name) {
  return name.trim().toLowerCase() === 'gamtgomt'
}
function buildTeamsFromRecord(recordTeams = []) {
  const filled = recordTeams.slice(0, TEAM_COUNT).map((t) => ({
    name: t.name ?? '',
    my_team: Boolean(t.my_team),
    _id: t.id ?? null,
  }))

  while (filled.length < TEAM_COUNT) {
    filled.push({ name: '', my_team: false, _id: null })
  }

  const firstMyTeam = filled.findIndex((t) => t.my_team)
  if (firstMyTeam >= 0) {
    return filled.map((t, i) => ({ ...t, my_team: i === firstMyTeam }))
  }

  return filled
}

export default function LeagueForm({ mode, record, onSaved }) {
  const [leagueName, setLeagueName] = useState('')
  const [fantraxId, setFantraxId] = useState('')
  const [ppr, setPpr] = useState(true)
  const [teams, setTeams] = useState(makeBlankTeams)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const importFantraxLeague = useImportFantraxLeague()
  const updateLeague = useUpdateLeague()
  const removeLeague = useDeleteLeague()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()

  useEffect(() => {
    if (mode === 'edit' && record) {
      setLeagueName(record.name ?? '')
      setFantraxId(record.fantrax_id ?? '')
      setPpr(record.ppr !== false)
      setTeams(buildTeamsFromRecord(record.teams ?? []))
    } else {
      setLeagueName('')
      setFantraxId('')
      setPpr(true)
      setTeams(makeBlankTeams())
    }
  }, [mode, record])

  const mutation = mode === 'create' ? importFantraxLeague : updateLeague
  const isPending =
    mutation.isPending ||
    removeLeague.isPending ||
    createTeam.isPending ||
    updateTeam.isPending

  function handleTeamName(index, value) {
    setTeams((prev) => {
      const next = prev.map((t, i) => (i === index ? { ...t, name: value } : t))
      // Auto-toggle my_team for gamtgomt (first match only, untoggle others)
      if (isGamtgomt(value)) {
        const alreadyHasMyTeam = next.some(
          (t, i) => i !== index && t.my_team
        )
        if (!alreadyHasMyTeam) {
          return next.map((t, i) =>
            i === index ? { ...t, my_team: true } : { ...t, my_team: false }
          )
        }
      }
      return next
    })
  }

  function handleMyTeam(index) {
    setTeams((prev) =>
      prev.map((t, i) => ({
        ...t,
        my_team: i === index ? !t.my_team : false,
      }))
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (mode === 'create') {
        await importFantraxLeague.mutateAsync({
          name: leagueName,
          fantrax_id: fantraxId,
          ppr,
        })
        setLeagueName('')
        setFantraxId('')
        setPpr(true)
        setTeams(makeBlankTeams())
        onSaved?.()
        return
      }

      let leagueId = record?.id
      const leaguePayload = { name: leagueName, fantrax_id: fantraxId || null, ppr }
      if (record) {
        await updateLeague.mutateAsync({ id: record.id, ...leaguePayload })
      }

      if (leagueId) {
        const teamOps = teams
          .filter((t) => t.name.trim())
          .map((t) => {
            const payload = {
              name: t.name.trim(),
              league_id: leagueId,
              my_team: t.my_team,
            }
            if (t._id) {
              return updateTeam.mutateAsync({ id: t._id, ...payload })
            }
            return createTeam.mutateAsync(payload)
          })
        await Promise.all(teamOps)
      }

      setLeagueName('')
      setTeams(makeBlankTeams())
      onSaved?.()
    } catch {
      // mutation.isError will display
    }
  }

  function handleDelete() {
    if (!record) return
    removeLeague.mutate(record.id, { onSuccess: () => onSaved?.() })
  }

  if (mode === 'edit' && !record) {
    return (
      <Typography color="text.secondary">
        Select a league from the sidebar dropdown.
      </Typography>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error?.body?.message || mutation.error?.message}
        </Alert>
      )}

      {/* League name + Fantrax ID */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <TextField
          label="League Name"
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="League Fantrax ID"
          value={fantraxId}
          onChange={(e) => setFantraxId(e.target.value)}
          required={mode === 'create'}
          fullWidth
          placeholder="e.g. 7j0paouemqvmrb09"
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 3,
          px: 0.5,
        }}
      >
        <Typography
          variant="body2"
          color={ppr ? 'secondary.main' : 'text.secondary'}
          sx={{ userSelect: 'none', fontWeight: ppr ? 600 : 400 }}
        >
          PPR scoring
        </Typography>
        <Switch
          size="small"
          checked={ppr}
          onChange={() => setPpr((v) => !v)}
          color="secondary"
        />
        <Typography variant="caption" color="text.secondary">
          {ppr ? 'Uses PPR rankings' : 'Uses non-PPR rankings'}
        </Typography>
      </Box>

      {mode === 'create' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Teams are imported from Fantrax automatically (all teams in the league,
          with yours marked as Mine).
        </Typography>
      )}

      {mode === 'edit' && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Teams ({TEAM_COUNT})
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {teams.map((team, i) => (
              <Card
                key={i}
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  gap: 1.5,
                  borderColor: team.my_team ? 'secondary.main' : 'divider',
                  bgcolor: team.my_team
                    ? 'rgba(212,165,116,0.06)'
                    : 'transparent',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{
                    width: 24,
                    textAlign: 'center',
                    flexShrink: 0,
                    color: 'text.secondary',
                  }}
                >
                  {i + 1}
                </Typography>

                <TextField
                  size="small"
                  placeholder={`Team ${i + 1}`}
                  value={team.name}
                  onChange={(e) => handleTeamName(i, e.target.value)}
                  sx={{ flex: 1 }}
                  variant="outlined"
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    color={team.my_team ? 'secondary.main' : 'text.secondary'}
                    sx={{ userSelect: 'none' }}
                  >
                    Mine
                  </Typography>
                  <Switch
                    size="small"
                    checked={team.my_team}
                    onChange={() => handleMyTeam(i)}
                    color="secondary"
                  />
                </Box>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        {mode === 'edit' && (
          <Button
            variant="outlined"
            color="error"
            startIcon={removeLeague.isPending ? <CircularProgress size={18} /> : <DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            Delete League
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          startIcon={
            mutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : mode === 'create' ? (
              <CloudDownloadIcon />
            ) : (
              <SaveIcon />
            )
          }
          disabled={isPending}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {mode === 'create' ? 'Import League from Fantrax' : 'Save Changes'}
        </Button>
      </Box>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete League"
        itemName={record?.name}
        message={`Are you sure you want to delete "${record?.name ?? 'this league'}" and all of its teams? This action cannot be undone.`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          handleDelete()
          setDeleteOpen(false)
        }}
        isLoading={removeLeague.isPending}
      />
    </Box>
  )
}
