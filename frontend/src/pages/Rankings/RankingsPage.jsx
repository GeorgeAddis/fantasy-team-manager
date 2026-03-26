import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek'
import EventIcon from '@mui/icons-material/Event'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { usePlayerList, useImportRankings } from '@/hooks/usePlayers'
import PasteDataDialog from '@/components/PasteDataDialog'

const MODES = [
  { key: 'week', label: 'Week', icon: CalendarViewWeekIcon },
  { key: 'season', label: 'Season', icon: EventIcon },
]

const POSITION_KEYS = ['QB', 'RB', 'WR', 'TE', 'RWT', 'DST', 'K']
const UPLOAD_TYPES = ['QB', 'RWT', 'DST', 'K']

function isRanked(value) {
  return Number.isFinite(value) && value > 0 && value < 999
}

export default function RankingsPage() {
  const [mode, setMode] = useState('week')
  const [position, setPosition] = useState('QB')
  const playerQuery = usePlayerList({ per_page: 5000, include_free_agents: 1 })
  const players = playerQuery.data?.data ?? []

  const [importOpen, setImportOpen] = useState(false)
  const [importType, setImportType] = useState('QB')
  const [importText, setImportText] = useState('')
  const importMutation = useImportRankings()

  function openImport() {
    setImportType('QB')
    setImportText('')
    importMutation.reset()
    setImportOpen(true)
  }

  function closeImport() {
    if (importMutation.isPending) return
    setImportOpen(false)
    setImportText('')
    importMutation.reset()
  }

  function handleImportSubmit() {
    if (!importText.trim()) return
    importMutation.mutate({ data: importText, type: importType, period: mode })
  }

  const importResult = importMutation.data

  const rows = useMemo(() => {
    if (!players.length) return []

    if (position === 'RWT') {
      const rankField = mode === 'week' ? 'week_rank' : 'season_rank'
      const posRankField = mode === 'week' ? 'week_position_rank' : 'season_position_rank'
      return players
        .filter((p) => (p.positions ?? []).some((pos) => ['RB', 'WR', 'TE'].includes(pos)))
        .filter((p) => isRanked(Number(p[rankField])))
        .map((p) => {
          const matchedPos = (p.positions ?? []).find((pos) => ['RB', 'WR', 'TE'].includes(pos)) ?? 'RB'
          return {
            id: p.id,
            name: p.name,
            team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
            rank: Number(p[rankField]),
            positionRankLabel: isRanked(Number(p[posRankField]))
              ? `${matchedPos}${Number(p[posRankField])}`
              : `${matchedPos}-`,
          }
        })
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    }

    const posRankField = mode === 'week' ? 'week_position_rank' : 'season_position_rank'
    return players
      .filter((p) => (p.positions ?? []).includes(position))
      .filter((p) => isRanked(Number(p[posRankField])))
      .map((p) => ({
        id: p.id,
        name: p.name,
        team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
        rank: Number(p[posRankField]),
      }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  }, [players, mode, position])

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '100%', overflow: 'hidden' }}>
      {/* ──── Sidebar ──── */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          overflowY: 'auto',
          gap: 2,
        }}
      >
        <Typography variant="h6" color="secondary.main">
          Rankings
        </Typography>

        {MODES.map(({ key, label, icon: Icon }) => {
          const selected = mode === key
          return (
            <Card
              key={key}
              variant="outlined"
              sx={{
                borderColor: selected ? 'secondary.main' : 'divider',
                bgcolor: selected ? 'rgba(212,165,116,0.08)' : 'transparent',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
            >
              <CardActionArea
                onClick={() => setMode(key)}
                sx={{ py: 1.5, px: 2, display: 'flex', justifyContent: 'flex-start', gap: 1.5 }}
              >
                <Icon sx={{ fontSize: 22, color: selected ? 'secondary.main' : 'text.secondary' }} />
                <Typography variant="body1" fontWeight={600} color={selected ? 'secondary.main' : 'text.primary'}>
                  {label}
                </Typography>
              </CardActionArea>
            </Card>
          )
        })}
        <Box sx={{ flex: 1 }} />
      </Box>

      {/* ──── Main content ──── */}
      <Box sx={{ flex: 1, minWidth: 0, p: 3, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" color="secondary.main" sx={{ flex: 1 }}>
            {mode === 'week' ? 'Week Rankings' : 'Season Rankings'}
          </Typography>

          {mode === 'week' && (
            <Tooltip title="Import rankings">
              <Button
                size="small"
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={openImport}
                sx={{
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                Import
              </Button>
            </Tooltip>
          )}
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={position}
          onChange={(_, next) => next && setPosition(next)}
          sx={{
            mb: 2,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 700,
              px: 1.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(212,165,116,0.15)',
                color: 'secondary.main',
                borderColor: 'secondary.main',
              },
            },
          }}
        >
          {POSITION_KEYS.map((key) => (
            <ToggleButton key={key} value={key}>{key}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {playerQuery.isLoading && <CircularProgress sx={{ mt: 2 }} />}

        {!playerQuery.isLoading && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: position === 'RWT' ? '90px 1fr 100px 140px' : '90px 1fr 100px',
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
              <Box>Player</Box>
              <Box>Team</Box>
              {position === 'RWT' && <Box>Position Rank</Box>}
            </Box>

            {rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: position === 'RWT' ? '90px 1fr 100px 140px' : '90px 1fr 100px',
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.rank}</Typography>
                <Typography variant="body2">{row.name}</Typography>
                <Typography variant="body2" color="text.secondary">{row.team}</Typography>
                {position === 'RWT' && (
                  <Typography variant="body2" color="text.secondary">{row.positionRankLabel}</Typography>
                )}
              </Box>
            ))}

            {rows.length === 0 && (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                <LeaderboardIcon sx={{ fontSize: 22, mb: 0.75, opacity: 0.7 }} />
                <Typography variant="body2">
                  No ranked players available for this view yet.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ──── Import Rankings Dialog ──── */}
      <PasteDataDialog
        open={importOpen}
        onClose={closeImport}
        title="Import Rankings"
        text={importText}
        onTextChange={setImportText}
        placeholder={'#\tPlayer (team)\tMatchup\t...\n1\tJosh Allen (BUF)\tvs. CIN\t...'}
        onSubmit={handleImportSubmit}
        isPending={importMutation.isPending}
        submitDisabled={!importText.trim()}
        submitLabel="Import"
        submitIcon={<UploadFileIcon />}
        showSubmit={!importResult}
        closeLabel={importResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a ranking type and paste the tab-separated data below.
        </Typography>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={importType}
          onChange={(_, next) => next && setImportType(next)}
          sx={{
            mb: 2,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              '&.Mui-selected': {
                bgcolor: 'rgba(212,165,116,0.15)',
                color: 'secondary.main',
                borderColor: 'secondary.main',
              },
            },
          }}
        >
          {UPLOAD_TYPES.map((t) => (
            <ToggleButton key={t} value={t}>{t}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {importMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {importMutation.error?.body?.message || importMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {importResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {importResult.updated} player{importResult.updated !== 1 ? 's' : ''} out of {importResult.total_lines} rows.
            </Alert>

            {importResult.not_found?.length > 0 && (
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
                  Players not found ({importResult.not_found.length})
                </Typography>
                {importResult.not_found.map((p, i) => (
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
