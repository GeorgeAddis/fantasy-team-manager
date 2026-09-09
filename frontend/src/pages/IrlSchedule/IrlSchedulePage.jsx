import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventIcon from '@mui/icons-material/Event'
import SyncIcon from '@mui/icons-material/Sync'
import { useSettings } from '@/hooks/useSettings'
import { useIrlSchedule, useUpdateIrlSchedule } from '@/hooks/useIrlSchedule'
import MatchupStartersDialog from './MatchupStartersDialog'

const MIN_WEEK = 1
const MAX_WEEK = 17

function defaultWeekFromSettings(settingsData) {
  const stored = parseInt(settingsData?.data?.current_week ?? '0', 10)
  if (!Number.isFinite(stored) || stored < MIN_WEEK) return MIN_WEEK
  return Math.min(stored, MAX_WEEK)
}

function groupByDay(games) {
  const groups = []
  const indexByDay = {}
  for (const game of games) {
    const day = game.day_label || 'Unknown day'
    if (indexByDay[day] == null) {
      indexByDay[day] = groups.length
      groups.push({ day, games: [] })
    }
    groups[indexByDay[day]].games.push(game)
  }
  return groups
}

function teamLabel(team) {
  if (!team) return '—'
  return team.abbreviated_name || team.name
}

export default function IrlSchedulePage() {
  const { data: settingsData, isLoading: settingsLoading } = useSettings()
  const [week, setWeek] = useState(null)
  const [matchup, setMatchup] = useState(null)
  const updateMutation = useUpdateIrlSchedule()

  useEffect(() => {
    if (week != null || !settingsData) return
    setWeek(defaultWeekFromSettings(settingsData))
  }, [settingsData, week])

  const scheduleQuery = useIrlSchedule(week)
  const games = scheduleQuery.data?.data ?? []
  const season = scheduleQuery.data?.season
  const groups = useMemo(() => groupByDay(games), [games])
  const loading = settingsLoading || week == null || scheduleQuery.isLoading

  function handleUpdate() {
    updateMutation.mutate(undefined)
  }

  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 3, overflow: 'auto' }}>
      <Typography variant="h5" color="secondary.main" sx={{ mb: 0.5 }}>
        IRL Schedule
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        NFL weeks 1–17. Kickoff times are Bangkok time (ICT).
        {season != null ? ` Season ${season}.` : ''}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          disabled={week == null || week <= MIN_WEEK}
          onClick={() => setWeek((w) => Math.max(MIN_WEEK, w - 1))}
          startIcon={<ChevronLeftIcon />}
          sx={{ textTransform: 'none', minWidth: 120, justifyContent: 'flex-start' }}
        >
          Week {week == null ? MIN_WEEK : Math.max(MIN_WEEK, week - 1)}
        </Button>

        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={700}>
            Week {week ?? MIN_WEEK}
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={updateMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            Update
          </Button>
        </Box>

        <Button
          disabled={week == null || week >= MAX_WEEK}
          onClick={() => setWeek((w) => Math.min(MAX_WEEK, w + 1))}
          endIcon={<ChevronRightIcon />}
          sx={{ textTransform: 'none', minWidth: 120, justifyContent: 'flex-end' }}
        >
          Week {week == null ? MIN_WEEK + 1 : Math.min(MAX_WEEK, week + 1)}
        </Button>
      </Box>

      {updateMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {updateMutation.error?.body?.message || updateMutation.error?.message || 'Could not update the schedule.'}
        </Alert>
      )}

      {updateMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Imported {updateMutation.data?.imported ?? 0} games for {updateMutation.data?.weeks ?? 17} weeks
          {updateMutation.data?.season ? ` (${updateMutation.data.season})` : ''}.
          {updateMutation.data?.unmatched?.length
            ? ` ${updateMutation.data.unmatched.length} game${updateMutation.data.unmatched.length === 1 ? '' : 's'} could not be matched.`
            : ''}
        </Alert>
      )}

      {updateMutation.data?.unmatched?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {updateMutation.data.unmatched.map((row) => `Week ${row.week}: ${row.name}`).join(' · ')}
        </Alert>
      )}

      {loading && <CircularProgress sx={{ mt: 2 }} />}

      {!loading && scheduleQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {scheduleQuery.error?.body?.message || scheduleQuery.error?.message || 'Could not load the schedule.'}
        </Alert>
      )}

      {!loading && !scheduleQuery.isError && groups.length === 0 && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <EventIcon sx={{ fontSize: 28, mb: 1, opacity: 0.7 }} />
          <Typography variant="body2">
            No games for this week yet. Use Update to pull the NFL schedule.
          </Typography>
        </Box>
      )}

      {!loading && !scheduleQuery.isError && groups.map((group) => (
        <Box key={group.day} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            {group.day}
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 40px 1fr',
                px: 2,
                py: 1,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                fontWeight: 700,
                color: 'text.secondary',
                fontSize: '0.85rem',
              }}
            >
              <Box>Time</Box>
              <Box>Away</Box>
              <Box />
              <Box>Home</Box>
            </Box>
            {group.games.map((game) => (
              <Box
                key={game.id}
                role="button"
                tabIndex={0}
                onClick={() => setMatchup(game)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setMatchup(game)
                  }
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 40px 1fr',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  '&:last-child': { borderBottom: 0 },
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {game.time_label}
                </Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {teamLabel(game.away)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {game.away?.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  @
                </Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {teamLabel(game.home)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {game.home?.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      <MatchupStartersDialog
        open={Boolean(matchup)}
        onClose={() => setMatchup(null)}
        game={matchup}
      />
    </Box>
  )
}
