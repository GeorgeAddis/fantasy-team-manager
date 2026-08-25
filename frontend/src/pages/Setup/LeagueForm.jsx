import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
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
  useFantraxAvailable,
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
  const [bestball, setBestball] = useState(false)
  const [teams, setTeams] = useState(makeBlankTeams)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const importFantraxLeague = useImportFantraxLeague()
  const updateLeague = useUpdateLeague()
  const removeLeague = useDeleteLeague()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const availableQuery = useFantraxAvailable({ enabled: mode === 'create' })
  const availableLeagues = availableQuery.data?.data ?? []

  useEffect(() => {
    if (mode === 'edit' && record) {
      setLeagueName(record.name ?? '')
      setFantraxId(record.fantrax_id ?? '')
      setPpr(record.ppr !== false)
      setBestball(Boolean(record.bestball))
      setTeams(buildTeamsFromRecord(record.teams ?? []))
    } else {
      setLeagueName('')
      setFantraxId('')
      setPpr(true)
      setBestball(false)
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

  function selectAvailableLeague(league) {
    setLeagueName(league.league_name || '')
    setFantraxId(league.league_id || '')
    const name = league.league_name || ''
    setBestball(/best\s*ball/i.test(name))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (mode === 'create') {
        await importFantraxLeague.mutateAsync({
          name: leagueName,
          fantrax_id: fantraxId,
          ppr,
          bestball,
        })
        setLeagueName('')
        setFantraxId('')
        setPpr(true)
        setBestball(false)
        setTeams(makeBlankTeams())
        onSaved?.()
        return
      }

      let leagueId = record?.id
      const leaguePayload = { name: leagueName, fantrax_id: fantraxId || null, ppr, bestball }
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
          mb: mode === 'create' ? 2 : 3,
          px: 0.5,
          flexWrap: 'wrap',
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
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          {ppr ? 'Uses PPR rankings' : 'Uses non-PPR rankings'}
        </Typography>

        <Typography
          variant="body2"
          color={bestball ? 'secondary.main' : 'text.secondary'}
          sx={{ userSelect: 'none', fontWeight: bestball ? 600 : 400 }}
        >
          Bestball
        </Typography>
        <Switch
          size="small"
          checked={bestball}
          onChange={() => setBestball((v) => !v)}
          color="secondary"
        />
        <Typography variant="caption" color="text.secondary">
          {bestball ? 'Bestball league' : 'Standard league'}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {mode === 'create' ? (
          <Button
            type="submit"
            variant="contained"
            size="small"
            startIcon={
              mutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CloudDownloadIcon />
              )
            }
            disabled={isPending}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Import League from Fantrax
          </Button>
        ) : null}
      </Box>

      {mode === 'create' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Available Fantrax Leagues
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            NFL leagues on your account that are not imported yet. Click one to fill the form.
          </Typography>

          {availableQuery.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {availableQuery.isError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {availableQuery.error?.body?.message
                || availableQuery.error?.message
                || 'Failed to load Fantrax leagues.'}
            </Alert>
          )}

          {!availableQuery.isLoading && !availableQuery.isError && availableLeagues.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 1 }}>
              All of your NFL Fantrax leagues are already imported.
            </Typography>
          )}

          {!availableQuery.isLoading && availableLeagues.length > 0 && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px',
                  px: 2,
                  py: 1,
                  bgcolor: 'background.paper',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Box>League Name</Box>
                <Box>League ID</Box>
              </Box>

              {availableLeagues.map((league) => {
                const selected = fantraxId === league.league_id
                return (
                  <CardActionArea
                    key={league.league_id}
                    onClick={() => selectAvailableLeague(league)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 220px',
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: selected ? 'rgba(212,165,116,0.08)' : 'transparent',
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={selected ? 700 : 600}
                      color={selected ? 'secondary.main' : 'text.primary'}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}
                    >
                      {league.league_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    >
                      {league.league_id}
                    </Typography>
                  </CardActionArea>
                )
              })}
            </Box>
          )}
        </Box>
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
      {mode === 'edit' && (
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={removeLeague.isPending ? <CircularProgress size={18} /> : <DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            Delete League
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={
              mutation.isPending ? (
                <CircularProgress size={18} color="inherit" />
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
            Save Changes
          </Button>
        </Box>
      )}
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
