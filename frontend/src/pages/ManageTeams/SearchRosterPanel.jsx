import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useSearchMyTeams } from '@/hooks/usePlayers'

const LINEUP_LABEL = {
  QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', WR3: 'WR',
  TE: 'TE', RWT: 'FLEX', K: 'K', DST: 'DST', BN: 'BN',
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

function ResultsTable({ results, type }) {
  if (!results || results.length === 0) return null

  const isPlayer = type === 'player'
  const gridCols = isPlayer
    ? '1fr 140px 100px'
    : '1fr 60px 100px 140px 100px'

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
          </>
        ) : (
          <>
            <Typography sx={HEADER_SX}>Player</Typography>
            <Typography sx={HEADER_SX}>Pos</Typography>
            <Typography sx={HEADER_SX}>Slot</Typography>
            <Typography sx={HEADER_SX}>Team</Typography>
            <Typography sx={HEADER_SX}>League</Typography>
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
                <ResultsTable results={results} type={type} />
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
                    gridTemplateColumns: '1fr',
                    px: 1.5,
                    py: 0.75,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={HEADER_SX}>League</Typography>
                </Box>
                <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
                  {availableLeagues.map((l) => (
                    <Box
                      key={l.league_id}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" sx={CELL_SX}>
                        {l.league_name}
                      </Typography>
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
          <ResultsTable results={results} type={type} />
        </>
      )}
    </Box>
  )
}
