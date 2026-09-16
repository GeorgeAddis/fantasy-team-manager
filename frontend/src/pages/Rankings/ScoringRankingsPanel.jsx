import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { usePlayerList, useImportRankings, useImportSeasonRankings, useImportWaiverRankings } from '@/hooks/usePlayers'
import PasteDataDialog from '@/components/PasteDataDialog'
import ImportSeasonRankingsDialog from '@/components/ImportSeasonRankingsDialog'
import PositionToggle from '@/components/PositionToggle'

const UPLOAD_TYPES = ['SFLEX', 'QB', 'RWT', 'DST', 'K']
const WAIVER_POSITIONS = ['OVR', 'QB', 'RB', 'WR', 'TE', 'K', 'DST']

function isRanked(value) {
  return Number.isFinite(value) && value > 0 && value < 999
}

function rankingFields(scoring) {
  if (scoring === 'ppr') {
    return {
      week_rank: 'week_rank',
      week_position_rank: 'week_position_rank',
      season_rank: 'season_rank',
      season_position_rank: 'season_position_rank',
      waiver_rank: 'waiver_rank',
      waiver_rank_overall: 'waiver_rank_overall',
    }
  }
  return {
    week_rank: 'week_rank_non_ppr',
    week_position_rank: 'week_position_rank_non_ppr',
    season_rank: 'season_rank_non_ppr',
    season_position_rank: 'season_position_rank_non_ppr',
    waiver_rank: 'waiver_rank_non_ppr',
    waiver_rank_overall: 'waiver_rank_overall_non_ppr',
  }
}

export default function ScoringRankingsPanel({ scoring, mode }) {
  const [position, setPosition] = useState('QB')
  const playerQuery = usePlayerList({ per_page: 5000, include_free_agents: 1 })
  const players = playerQuery.data?.data ?? []
  const isPpr = scoring === 'ppr'
  const scoringLabel = isPpr ? 'PPR' : 'Non-PPR'

  const [importOpen, setImportOpen] = useState(false)
  const [importType, setImportType] = useState('SFLEX')
  const [importText, setImportText] = useState('')
  const [applyBoth, setApplyBoth] = useState(true)
  const importMutation = useImportRankings()

  const [seasonImportOpen, setSeasonImportOpen] = useState(false)
  const seasonImportMutation = useImportSeasonRankings()

  const [waiverImportOpen, setWaiverImportOpen] = useState(false)
  const [waiverImportType, setWaiverImportType] = useState('QB')
  const [waiverImportText, setWaiverImportText] = useState('')
  const waiverImportMutation = useImportWaiverRankings()

  function openImport() {
    setImportType('SFLEX')
    setImportText('')
    setApplyBoth(true)
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
    importMutation.mutate({ data: importText, type: importType, period: mode, ppr: isPpr, apply_both: applyBoth })
  }

  function openSeasonImport() {
    seasonImportMutation.reset()
    setSeasonImportOpen(true)
  }

  function closeSeasonImport() {
    if (seasonImportMutation.isPending) return
    setSeasonImportOpen(false)
    seasonImportMutation.reset()
  }

  function handleSeasonImportSubmit(payload) {
    seasonImportMutation.mutate({ ...payload, ppr: isPpr })
  }

  function openWaiverImport() {
    setWaiverImportType(WAIVER_POSITIONS.includes(position) ? position : 'OVR')
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
    waiverImportMutation.mutate({ data: waiverImportText, type: waiverImportType, ppr: isPpr })
  }

  const importResult = importMutation.data
  const seasonImportResult = seasonImportMutation.data
  const waiverImportResult = waiverImportMutation.data

  const rows = useMemo(() => {
    if (!players.length) return []
    const fields = rankingFields(scoring)

    if (mode === 'waiver') {
      if (position === 'OVR') {
        return players
          .filter((p) => isRanked(Number(p[fields.waiver_rank_overall])))
          .map((p) => {
            const pos = (p.positions ?? [])[0] ?? ''
            return {
              id: p.id,
              name: p.name,
              team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
              rank: Number(p[fields.waiver_rank_overall]),
              positionRankLabel: isRanked(Number(p[fields.waiver_rank])) ? `${pos}${p[fields.waiver_rank]}` : pos,
            }
          })
          .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
      }
      return players
        .filter((p) => (p.positions ?? []).includes(position))
        .filter((p) => isRanked(Number(p[fields.waiver_rank])))
        .map((p) => ({
          id: p.id,
          name: p.name,
          team: p.irl_franchise_abbr || p.irl_franchise_name || 'FA',
          rank: Number(p[fields.waiver_rank]),
        }))
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    }

    if (position === 'RWT') {
      const rankField = mode === 'week' ? fields.week_rank : fields.season_rank
      const posRankField = mode === 'week' ? fields.week_position_rank : fields.season_position_rank
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

    const posRankField = mode === 'week' ? fields.week_position_rank : fields.season_position_rank
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
  }, [players, mode, position, scoring])

  const modeTitle = mode === 'week'
    ? `${scoringLabel} Week Rankings`
    : mode === 'season'
      ? `${scoringLabel} Season Rankings`
      : `${scoringLabel} Waiver Wire Rankings`
  const showPosColumn = (position === 'RWT' && mode !== 'waiver') || (mode === 'waiver' && position === 'OVR')

  function handleImportClick() {
    if (mode === 'week') openImport()
    else if (mode === 'season') openSeasonImport()
    else openWaiverImport()
  }

  return (
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

      <PasteDataDialog
        open={importOpen}
        onClose={closeImport}
        title={`Import ${scoringLabel} Week Rankings`}
        text={importText}
        onTextChange={setImportText}
        placeholder={'#\tPlayer (team)\tMatchup\tPos\t...\n1\tJahmyr Gibbs (DET)\tvs. NO\tRB1\n2\tJa\'Marr Chase (CIN)\tvs. TB\tWR1\n3\tLamar Jackson (BAL)\tat IND\tQB1'}
        onSubmit={handleImportSubmit}
        isPending={importMutation.isPending}
        submitDisabled={!importText.trim()}
        submitLabel="Import"
        submitIcon={<UploadFileIcon />}
        showSubmit={!importResult}
        closeLabel={importResult ? 'Close' : 'Cancel'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {importType === 'SFLEX'
            ? 'Paste a superflex list (QB + RB/WR/TE). QBs are extracted into QB ranks; everyone else gets RWT ranks and Pos ranks, same as pasting those lists separately.'
            : 'Select a ranking type and paste the tab-separated data below.'}
        </Typography>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={applyBoth}
              onChange={(e) => setApplyBoth(e.target.checked)}
              color="secondary"
              disabled={importMutation.isPending || Boolean(importResult)}
            />
          }
          label="Apply the same ranks to PPR and Non-PPR"
          sx={{ mb: 2, display: 'block', '& .MuiTypography-root': { fontSize: '0.875rem' } }}
        />

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

      <ImportSeasonRankingsDialog
        open={seasonImportOpen}
        onClose={closeSeasonImport}
        onImport={handleSeasonImportSubmit}
        isLoading={seasonImportMutation.isPending}
        result={seasonImportResult}
        error={seasonImportMutation.error}
        title={`Import ${scoringLabel} Season Rankings`}
      />

      <PasteDataDialog
        open={waiverImportOpen}
        onClose={closeWaiverImport}
        title={`Import ${scoringLabel} Waiver Wire Rankings`}
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
          {waiverImportType === 'OVR'
            ? 'Paste overall waiver order, one name per line. Position ranks (QB, RB, WR, TE, K, DST) are filled from that same order. Pasting a single position does not change overall ranks. Written to both PPR and non-PPR.'
            : 'Paste player names below, one per line. Line order determines that position rank only — overall ranks are left unchanged. Written to both PPR and non-PPR.'}
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
