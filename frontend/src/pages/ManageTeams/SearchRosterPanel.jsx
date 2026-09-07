import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { useSearchMyTeams } from '@/hooks/usePlayers'
import RosterDialog from '@/components/RosterDialog'

const LINEUP_LABEL = {
  QB: 'QB',
  RB1: 'RB1',
  RB2: 'RB2',
  WR1: 'WR1',
  WR2: 'WR2',
  WR3: 'WR3',
  TE: 'TE',
  RWT: 'FLEX',
  K: 'K',
  DST: 'DST',
  BN: 'BN',
}

const HEADER_SX = {
  fontWeight: 700,
  color: 'text.secondary',
  fontSize: '0.8rem',
}

const CELL_SX = {
  fontSize: '0.8rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function ViewRosterButton({ row, onViewRoster }) {
  if (!row.team_id) return null
  return (
    <Button
      size="small"
      variant="contained"
      startIcon={<ListAltIcon />}
      onClick={() => onViewRoster?.({
        teamId: row.team_id,
        teamName: row.team_name,
        leagueName: row.league_name,
      })}
      sx={{
        textTransform: 'none',
        bgcolor: 'primary.main',
        '&:hover': { bgcolor: 'primary.dark' },
      }}
    >
      View Roster
    </Button>
  )
}

function ResultsTable({ results, type, onViewRoster }) {
  if (!results || results.length === 0) return null

  const isPlayer = type === 'player'
  const gridCols = isPlayer
    ? '1fr 140px 80px 130px'
    : '1fr 60px 80px 140px 100px 130px'

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          px: 1.5,
          py: 0.75,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {isPlayer ? (
          <>
            <Typography sx={HEADER_SX}>League</Typography>
            <Typography sx={HEADER_SX}>Team</Typography>
            <Typography sx={HEADER_SX}>Slot</Typography>
            <Typography sx={HEADER_SX}>Roster</Typography>
          </>
        ) : (
          <>
            <Typography sx={HEADER_SX}>Player</Typography>
            <Typography sx={HEADER_SX}>Pos</Typography>
            <Typography sx={HEADER_SX}>Slot</Typography>
            <Typography sx={HEADER_SX}>Team</Typography>
            <Typography sx={HEADER_SX}>League</Typography>
            <Typography sx={HEADER_SX}>Roster</Typography>
          </>
        )}
      </Box>

      <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
        {results.map((row, idx) => (
          <Box
            key={`${row.player_id}-${row.league_id}-${idx}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              px: 1.5,
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
              bgcolor: row.lineup_position === 'BN'
                ? 'transparent'
                : 'rgba(212,165,116,0.08)',
            }}
          >
            {isPlayer ? (
              <>
                <Typography variant="body2" sx={CELL_SX}>
                  {row.league_name}
                </Typography>
                <Typography variant="body2" sx={{ ...CELL_SX, color: 'text.secondary' }}>
                  {row.team_name}
                </Typography>
                <Typography variant="body2" sx={{ ...CELL_SX, fontWeight: 600, color: 'secondary.main' }}>
                  {LINEUP_LABEL[row.lineup_position] ?? row.lineup_position}
                </Typography>
                <Box>
                  <ViewRosterButton row={row} onViewRoster={onViewRoster} />
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={CELL_SX}>
                  {row.player_name}
                </Typography>
                <Typography variant="body2" sx={{ ...CELL_SX, color: 'text.secondary' }}>
                  {(row.positions ?? []).join('/')}
                </Typography>
                <Typography variant="body2" sx={{ ...CELL_SX, fontWeight: 600, color: 'secondary.main' }}>
                  {LINEUP_LABEL[row.lineup_position] ?? row.lineup_position}
                </Typography>
                <Typography variant="body2" sx={{ ...CELL_SX, color: 'text.secondary' }}>
                  {row.team_name}
                </Typography>
                <Typography variant="body2" sx={CELL_SX}>
                  {row.league_name}
                </Typography>
                <Box>
                  <ViewRosterButton row={row} onViewRoster={onViewRoster} />
                </Box>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default function SearchRosterPanel({ type }) {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [rosterTarget, setRosterTarget] = useState(null)

  const { data, isLoading } = useSearchMyTeams(
    search ? { search, type } : {},
  )

  const results = data?.results ?? []
  const availableLeagues = data?.available_leagues ?? []
  const status = data?.status ?? null
  const matchedNames = data?.matched_names ?? []
  const isPlayer = type === 'player'

  function handleSubmit(e) {
    e.preventDefault()
    setSearch(input.trim())
  }

  const placeholder = isPlayer
    ? 'Enter player name...'
    : 'Enter team name (e.g. Chiefs, KC)...'

  const title = isPlayer ? 'Search for Player' : 'Search for Franchise'

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
        {title}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
          <TextField
            size="small"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            sx={{ flex: 1 }}
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!input.trim()}
            sx={{ textTransform: 'none', minWidth: 90 }}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>
      </form>

      {isLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}

      {!isLoading && search && status === 'not_found' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {isPlayer ? 'Player not found in database.' : 'Franchise not found in database.'}
        </Typography>
      )}

      {!isLoading && search && status === 'not_found' && null /* handled above */}

      {!isLoading && search && status === 'not_on_teams' && !isPlayer && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No players from this franchise are on any of your teams.
        </Typography>
      )}

      {/* Player search: two-column layout */}
      {!isLoading && isPlayer && search && status !== 'not_found' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {/* Left: My Teams */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              On My Teams
            </Typography>
            {results.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {`"${matchedNames[0] || search}" is not on any of your teams.`}
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Found on {new Set(results.map((r) => r.league_name)).size} league{new Set(results.map((r) => r.league_name)).size === 1 ? '' : 's'}
                </Typography>
                <ResultsTable results={results} type={type} onViewRoster={setRosterTarget} />
              </>
            )}
          </Box>

          {/* Right: Available In */}
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Available In
            </Typography>
            {availableLeagues.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Not available in any other leagues.
              </Typography>
            ) : (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 130px',
                    px: 1.5,
                    py: 0.75,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={HEADER_SX}>League</Typography>
                  <Typography sx={HEADER_SX}>Team</Typography>
                  <Typography sx={HEADER_SX}>Roster</Typography>
                </Box>
                <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {availableLeagues.map((l) => (
                    <Box
                      key={l.league_id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 130px',
                        px: 1.5,
                        py: 0.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={CELL_SX}>
                        {l.league_name}
                      </Typography>
                      <Typography variant="body2" sx={{ ...CELL_SX, color: 'text.secondary' }}>
                        {l.team_name}
                      </Typography>
                      <Box>
                        <ViewRosterButton row={l} onViewRoster={setRosterTarget} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Franchise search: single column */}
      {!isLoading && !isPlayer && results.length > 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Found on {new Set(results.map((r) => r.league_name)).size} league{new Set(results.map((r) => r.league_name)).size === 1 ? '' : 's'} ({results.length} slot{results.length === 1 ? '' : 's'})
          </Typography>
          <ResultsTable results={results} type={type} onViewRoster={setRosterTarget} />
        </>
      )}

      <RosterDialog
        open={Boolean(rosterTarget)}
        onClose={() => setRosterTarget(null)}
        teamId={rosterTarget?.teamId}
        teamName={rosterTarget?.teamName}
        leagueName={rosterTarget?.leagueName}
      />
    </Box>
  )
}
