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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { usePlayerList, useImportRankings, useImportSeasonRankings, useImportWaiverRankings } from '@/hooks/usePlayers'
import PasteDataDialog from '@/components/PasteDataDialog'
import PositionToggle from '@/components/PositionToggle'

const MODES = [
  { key: 'week', label: 'Week', icon: CalendarViewWeekIcon },
  { key: 'season', label: 'Season', icon: EventIcon },
  { key: 'waiver', label: 'Waiver Wire', icon: SwapHorizIcon },
]

const UPLOAD_TYPES = ['QB', 'RWT', 'DST', 'K']
const WAIVER_POSITIONS = ['OVR', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']

function isRanked(value) {
  return Number.isFinite(value) && value > 0 && value < 999
}

export default function RankingsPage() {
  const [mode, setMode] = useState('week')
  const [position, setPosition] = useState('QB')
  const playerQuery = usePlayerList({ per_page: 5000, include_free_agents: 1 })
  const players = playerQuery.data?.data ?? []

  // Week import state
  const [importOpen, setImportOpen] = useState(false)
  const [importType, setImportType] = useState('QB')
  const [importText, setImportText] = useState('')
  const importMutation = useImportRankings()

  // Season import state
  const [seasonImportOpen, setSeasonImportOpen] = useState(false)
  const [seasonImportText, setSeasonImportText] = useState('')
  const seasonImportMutation = useImportSeasonRankings()

  // Waiver import state
  const [waiverImportOpen, setWaiverImportOpen] = useState(false)
  const [waiverImportType, setWaiverImportType] = useState('QB')
  const [waiverImportText, setWaiverImportText] = useState('')
  const waiverImportMutation = useImportWaiverRankings()

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

  function openSeasonImport() {
    setSeasonImportText('')
    seasonImportMutation.reset()
    setSeasonImportOpen(true)
  }

  function closeSeasonImport() {
    if (seasonImportMutation.isPending) return
    setSeasonImportOpen(false)
    setSeasonImportText('')
    seasonImportMutation.reset()
  }

  function handleSeasonImportSubmit() {
    if (!seasonImportText.trim()) return
    seasonImportMutation.mutate({ data: seasonImportText })
  }

  function openWaiverImport() {
    setWaiverImportType('QB')
    setWaiverImportText('')
    waiverImportMutation.reset()
    setWaiverImportOpen(true)
  }

  function closeWaiverImport() {
    if (waiverImportMutation.isPending) return
    setWaiverImportOpen(false)
    setWaiverImportText('')
    waiverImportMutation.reset()
  }

  function handleWaiverImportSubmit() {
    if (!waiverImportText.trim()) return
    waiverImportMutation.mutate({ data: waiverImportText, type: waiverImportType })
  }

  const importResult = importMutation.data
  const seasonImportResult = seasonImportMutation.data
  const waiverImportResult = waiverImportMutation.data

  const rows = useMemo(() => {
    if (!players.length) return []

    if (mode === 'waiver') {
      if (position === 'OVR') {
        return players
          .filter((p) => isRanked(Number(p.waiver_rank_overall)))
          .map((p) => {
            const pos = (p.positions ?? [])[0] ?? ''
            return {
              id: p.id,
              name: p.name,
              team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
              rank: Number(p.waiver_rank_overall),
              positionRankLabel: isRanked(Number(p.waiver_rank)) ? `${pos}${p.waiver_rank}` : pos,
            }
          })
          .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
      }
      return players
        .filter((p) => (p.positions ?? []).includes(position))
        .filter((p) => isRanked(Number(p.waiver_rank)))
        .map((p) => ({
          id: p.id,
          name: p.name,
          team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
          rank: Number(p.waiver_rank),
        }))
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    }

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

  const modeTitle = mode === 'week' ? 'Week Rankings' : mode === 'season' ? 'Season Rankings' : 'Waiver Wire Rankings'
  const showPosColumn = (position === 'RWT' && mode !== 'waiver') || (mode === 'waiver' && position === 'OVR')

  function handleImportClick() {
    if (mode === 'week') openImport()
    else if (mode === 'season') openSeasonImport()
    else openWaiverImport()
  }

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
            {modeTitle}
          </Typography>

          <Tooltip title="Import rankings">
            <Button
              size="small"
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleImportClick}
              sx={{
                textTransform: 'none',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              Import
            </Button>
          </Tooltip>
        </Box>

        <PositionToggle
          value={position}
          onChange={setPosition}
          positions={mode === 'waiver' ? WAIVER_POSITIONS : undefined}
          sx={{ mb: 2 }}
        />

        {playerQuery.isLoading && <CircularProgress sx={{ mt: 2 }} />}

        {!playerQuery.isLoading && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: showPosColumn ? '90px 1fr 100px 140px' : '90px 1fr 100px',
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
              {showPosColumn && <Box>Position Rank</Box>}
            </Box>

            {rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: showPosColumn ? '90px 1fr 100px 140px' : '90px 1fr 100px',
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
                {showPosColumn && (
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

      {/* ──── Import Week Rankings Dialog ──── */}
      <PasteDataDialog
        open={importOpen}
        onClose={closeImport}
        title="Import Week Rankings"
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

      {/* ──── Import Season Rankings Dialog ──── */}
      <PasteDataDialog
        open={seasonImportOpen}
        onClose={closeSeasonImport}
        title="Import Season Rankings"
        text={seasonImportText}
        onTextChange={setSeasonImportText}
        placeholder={"Player\tTeam\tPosition\tAge\tStatus\t1QB Rank\tSF/TE Prem\t1QB Pos Rk\n Ja'Marr Chase\tCIN\tWR\t26.1\tVeteran\t1\t3\tWR01"}
        onSubmit={handleSeasonImportSubmit}
        isPending={seasonImportMutation.isPending}
        submitDisabled={!seasonImportText.trim()}
        submitLabel="Import"
        submitIcon={<UploadFileIcon />}
        showSubmit={!seasonImportResult}
        closeLabel={seasonImportResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste the full season rankings data below (all positions). Tab-separated
          with columns: Player, Team, Position, Age, Status, 1QB Rank, SF/TE Prem, 1QB Pos Rk.
        </Typography>

        {seasonImportMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {seasonImportMutation.error?.body?.message || seasonImportMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {seasonImportResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {seasonImportResult.updated} player{seasonImportResult.updated !== 1 ? 's' : ''} out of {seasonImportResult.total_lines} rows.
            </Alert>

            {seasonImportResult.not_found?.length > 0 && (
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
                  Players not found ({seasonImportResult.not_found.length})
                </Typography>
                {seasonImportResult.not_found.map((p, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    #{p.rank}: {p.name} ({p.position})
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </PasteDataDialog>

      {/* ──── Import Waiver Wire Rankings Dialog ──── */}
      <PasteDataDialog
        open={waiverImportOpen}
        onClose={closeWaiverImport}
        title="Import Waiver Wire Rankings"
        text={waiverImportText}
        onTextChange={setWaiverImportText}
        placeholder={'Patrick Mahomes\nJosh Allen\nLamar Jackson\n...'}
        onSubmit={handleWaiverImportSubmit}
        isPending={waiverImportMutation.isPending}
        submitDisabled={!waiverImportText.trim()}
        submitLabel="Import"
        submitIcon={<UploadFileIcon />}
        showSubmit
        closeLabel="Cancel"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a position and paste player names below, one per line. Line order determines rank.
        </Typography>

        <PositionToggle
          value={waiverImportType}
          onChange={setWaiverImportType}
          positions={WAIVER_POSITIONS}
          sx={{ mb: 2 }}
        />

        {waiverImportMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {waiverImportMutation.error?.body?.message || waiverImportMutation.error?.message || 'Something went wrong.'}
          </Alert>
        )}

        {waiverImportResult && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" sx={{ mb: 1.5 }}>
              Updated {waiverImportResult.updated} player{waiverImportResult.updated !== 1 ? 's' : ''} out of {waiverImportResult.total_lines} rows.
            </Alert>

            {waiverImportResult.not_found?.length > 0 && (
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
                  Players not found ({waiverImportResult.not_found.length})
                </Typography>
                {waiverImportResult.not_found.map((p, i) => (
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
