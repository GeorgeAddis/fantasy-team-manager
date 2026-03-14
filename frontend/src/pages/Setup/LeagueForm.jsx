import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import {
  useCreateLeague,
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

export default function LeagueForm({ mode, record, onSaved }) {
  const [leagueName, setLeagueName] = useState('')
  const [teams, setTeams] = useState(makeBlankTeams)

  const createLeague = useCreateLeague()
  const updateLeague = useUpdateLeague()
  const removeLeague = useDeleteLeague()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()

  useEffect(() => {
    if (mode === 'edit' && record) {
      setLeagueName(record.name ?? '')
      // TODO: load existing teams for this league from API
      setTeams(makeBlankTeams())
    } else {
      setLeagueName('')
      setTeams(makeBlankTeams())
    }
  }, [mode, record])

  const mutation = mode === 'create' ? createLeague : updateLeague
  const isPending = mutation.isPending || removeLeague.isPending

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
      let leagueId = record?.id
      if (mode === 'create') {
        const res = await createLeague.mutateAsync({ name: leagueName })
        leagueId = res?.data?.id
      } else if (record) {
        await updateLeague.mutateAsync({ id: record.id, name: leagueName })
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
    if (!window.confirm(`Delete league "${record.name}" and all its teams?`))
      return
    removeLeague.mutate(record.id, { onSuccess: () => onSaved?.() })
  }

  if (mode === 'edit' && !record) {
    return (
      <Typography color="text.secondary">
        Select a league from the sidebar dropdown.
      </Typography>
    )
  }

  const myTeamIndex = teams.findIndex((t) => t.my_team)

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {mode === 'create' ? 'New League' : `Edit: ${record?.name}`}
        </Typography>

        {myTeamIndex >= 0 && teams[myTeamIndex].name && (
          <Chip
            icon={<StarIcon sx={{ fontSize: 16 }} />}
            label={`My Team: ${teams[myTeamIndex].name}`}
            color="secondary"
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {mutation.error?.body?.message || mutation.error?.message}
        </Alert>
      )}

      {/* League name */}
      <TextField
        label="League Name"
        value={leagueName}
        onChange={(e) => setLeagueName(e.target.value)}
        required
        fullWidth
        sx={{ mb: 3 }}
      />

      <Divider sx={{ mb: 2 }} />

      {/* Teams header */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        Teams ({TEAM_COUNT})
      </Typography>

      {/* 2-column team grid */}
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

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        {mode === 'edit' && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={isPending}
          >
            Delete League
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
          {mode === 'create' ? 'Create League & Teams' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  )
}
