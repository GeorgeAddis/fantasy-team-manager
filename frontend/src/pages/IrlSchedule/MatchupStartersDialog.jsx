import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

const POSITION_COLORS = {
  QB: '#e57373',
  RB: '#64b5f6',
  WR: '#81c784',
  TE: '#ffb74d',
  K: '#a1887f',
  DST: '#90a4ae',
}

function teamLabel(team) {
  if (!team) return '—'
  return team.abbreviated_name || team.name
}

function posLabel(positions) {
  return positions?.[0] || '—'
}

function LeagueList({ leagues, color = 'text.secondary' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
      {leagues.map((league) => (
        <Typography
          key={league.id}
          variant="caption"
          sx={{ color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {league.name}
        </Typography>
      ))}
    </Box>
  )
}

function PlayerLeagues({ mine, against }) {
  const hasMine = mine.length > 0
  const hasAgainst = against.length > 0

  if (hasMine && hasAgainst) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, pl: 0.25 }}>
        <LeagueList leagues={mine} />
        <LeagueList leagues={against} color="error.light" />
      </Box>
    )
  }

  return (
    <Box sx={{ pl: 0.25 }}>
      <LeagueList
        leagues={hasMine ? mine : against}
        color={hasMine ? 'text.secondary' : 'error.light'}
      />
    </Box>
  )
}

function TeamStarters({ team }) {
  const starters = team?.starters ?? []

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>
        {teamLabel(team)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {team?.name}
      </Typography>
      {starters.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No starters or opponents on this team.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {starters.map((player) => {
            const pos = posLabel(player.positions)
            const mine = player.leagues ?? []
            const against = player.against ?? []
            return (
              <Box
                key={player.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.25,
                  py: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Chip
                    label={pos}
                    size="small"
                    sx={{
                      width: 40,
                      height: 22,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      bgcolor: POSITION_COLORS[pos] ?? '#616161',
                      color: '#fff',
                    }}
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </Typography>
                </Box>
                <PlayerLeagues mine={mine} against={against} />
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export default function MatchupStartersDialog({ open, onClose, game }) {
  if (!game) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {teamLabel(game.away)} @ {teamLabel(game.home)}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Your starters and this week’s Fantrax opponents
            {game.day_label ? ` · ${game.day_label}` : ''}
            {game.time_label ? ` · ${game.time_label}` : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 3 }}>
          <TeamStarters team={game.away} />
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <TeamStarters team={game.home} />
        </Box>
      </DialogContent>
    </Dialog>
  )
}
