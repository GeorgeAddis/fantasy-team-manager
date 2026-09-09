import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SyncIcon from '@mui/icons-material/Sync'
import PasteDataDialog from '@/components/PasteDataDialog'
import { useSettings } from '@/hooks/useSettings'
import {
  useCopyDefenseWeekRanksFromWeekRankings,
  useDefenseWeekRanks,
  useUpdateDefenseWeekRanks,
} from '@/hooks/useDefenseWeekRanks'

const MIN_WEEK = 1
const MAX_WEEK = 17

function defaultWeekFromSettings(settingsData) {
  const stored = parseInt(settingsData?.data?.current_week ?? '0', 10)
  if (!Number.isFinite(stored) || stored < MIN_WEEK) return MIN_WEEK
  return Math.min(stored, MAX_WEEK)
}

export default function DefenseWeekByWeekPanel() {
  const { data: settingsData, isLoading: settingsLoading } = useSettings()
  const [week, setWeek] = useState(null)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateText, setUpdateText] = useState('')
  const updateMutation = useUpdateDefenseWeekRanks()
  const copyMutation = useCopyDefenseWeekRanksFromWeekRankings()

  useEffect(() => {
    if (week != null || !settingsData) return
    setWeek(defaultWeekFromSettings(settingsData))
  }, [settingsData, week])

  const ranksQuery = useDefenseWeekRanks(week)
  const rows = ranksQuery.data?.data ?? []
  const updateResult = updateMutation.data ?? copyMutation.data
  const dialogPending = updateMutation.isPending || copyMutation.isPending

  function openUpdate() {
    setUpdateText('')
    updateMutation.reset()
    copyMutation.reset()
    setUpdateOpen(true)
  }

  function closeUpdate() {
    if (dialogPending) return
    setUpdateOpen(false)
    setUpdateText('')
    updateMutation.reset()
    copyMutation.reset()
  }

  function handleUpdateSubmit() {
    if (!updateText.trim() || week == null) return
    copyMutation.reset()
    updateMutation.mutate({ week, data: updateText })
  }

  function handleCopyFromWeekRankings() {
    if (week == null) return
    updateMutation.reset()
    copyMutation.mutate(week)
  }

  const loading = settingsLoading || week == null || ranksQuery.isLoading

  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 3, overflow: 'auto' }}>
      <Typography variant="h5" color="secondary.main" sx={{ mb: 2 }}>
        Defense Week by Week Rankings
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
            startIcon={<SyncIcon />}
            onClick={openUpdate}
            disabled={week == null}
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

      {loading && <CircularProgress sx={{ mt: 2 }} />}

      {!loading && ranksQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {ranksQuery.error?.body?.message || ranksQuery.error?.message || 'Could not load defense rankings.'}
        </Alert>
      )}

      {!loading && !ranksQuery.isError && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr',
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
            <Box>Rank</Box>
            <Box>Defense</Box>
          </Box>

          {rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.rank}</Typography>
              <Typography variant="body2">{row.name}</Typography>
            </Box>
          ))}

          {rows.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <LeaderboardIcon sx={{ fontSize: 22, mb: 0.75, opacity: 0.7 }} />
              <Typography variant="body2">
                No defense rankings for this week yet.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <PasteDataDialog
        open={updateOpen}
        onClose={closeUpdate}
        title={`Update Defense Rankings — Week ${week ?? ''}`}
        text={updateText}
        onTextChange={setUpdateText}
        placeholder={'PIT\nSan Francisco\nRams\nKC DST\n...'}
        onSubmit={handleUpdateSubmit}
        isPending={dialogPending}
        submitDisabled={!updateText.trim()}
        submitLabel="Update"
        submitIcon={<SyncIcon />}
        showSubmit
        closeLabel={updateResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste defense names, one per line. Line order is rank. This replaces any existing ranks for week {week}.
        </Typography>

        <Button
          size="small"
          variant="outlined"
          startIcon={copyMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <ContentCopyIcon />}
          onClick={handleCopyFromWeekRankings}
          disabled={dialogPending || week == null}
          sx={{ textTransform: 'none', mb: 2 }}
        >
          Copy from Week Rankings
        </Button>

        {(updateMutation.isError || copyMutation.isError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {updateMutation.error?.body?.message
              || copyMutation.error?.body?.message
              || updateMutation.error?.message
              || copyMutation.error?.message
              || 'Something went wrong.'}
          </Alert>
        )}

        {updateResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              {updateResult.source === 'week_rankings'
                ? `Copied ${updateResult.updated} defense${updateResult.updated !== 1 ? 's' : ''} from week rankings into week ${updateResult.week}.`
                : `Updated ${updateResult.updated} defense${updateResult.updated !== 1 ? 's' : ''} out of ${updateResult.total_lines} rows.`}
            </Alert>

            {updateResult.not_found?.length > 0 && (
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
                  Defenses not found ({updateResult.not_found.length})
                </Typography>
                {updateResult.not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.rank}: {p.name}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </PasteDataDialog>
    </Box>
  )
}
