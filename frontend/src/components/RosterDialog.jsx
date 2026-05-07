import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ErrorIcon from '@mui/icons-material/Error'
import { useTeamRoster } from '@/hooks/useTeams'

const STARTER_POSITIONS = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'RWT', 'K', 'DST']

const POSITION_LABELS = {
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

const POSITION_COLORS = {
  QB: '#e57373',
  RB1: '#64b5f6',
  RB2: '#64b5f6',
  WR1: '#81c784',
  WR2: '#81c784',
  WR3: '#81c784',
  TE: '#ffb74d',
  RWT: '#ce93d8',
  K: '#a1887f',
  DST: '#90a4ae',
  BN: '#616161',
}

function SlotRow({ slot }) {
  const pos = slot.lineup_position
  const player = slot.player
  const label = POSITION_LABELS[pos] ?? pos
  const color = POSITION_COLORS[pos] ?? '#616161'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
      }}
    >
      <Chip
        label={label}
        size="small"
        sx={{
          width: 52,
          fontWeight: 700,
          fontSize: '0.7rem',
          bgcolor: color,
          color: '#fff',
        }}
      />
      {player ? (
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
          {player.do_not_roster && (
            <ErrorIcon sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />
          )}
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {player.name}
          </Typography>
          {player.irl_franchise_abbr && (
            <Typography variant="caption" color="text.secondary">
              {player.irl_franchise_abbr}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {player.week_position_rank != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
              #{player.week_position_rank}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
          Empty
        </Typography>
      )}
    </Box>
  )
}

export default function RosterDialog({ open, onClose, teamId, teamName, leagueName }) {
  const { data, isLoading } = useTeamRoster(teamId, { enabled: open && teamId != null })
  const slots = data?.data ?? []

  const starters = slots.filter((s) => STARTER_POSITIONS.includes(s.lineup_position))
  const bench = slots.filter((s) => s.lineup_position === 'BN')

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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
            {teamName ?? 'Roster'}
          </Typography>
          {leagueName && (
            <Typography variant="caption" display="block" color="text.secondary">
              {leagueName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : slots.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No roster data available.
          </Typography>
        ) : (
          <>
            <Typography
              variant="overline"
              sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: 1.5, mb: 0.5 }}
            >
              Starters
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {starters.map((slot, i) => (
                <SlotRow key={i} slot={slot} />
              ))}
            </Box>

            {bench.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1.5, mb: 0.5 }}
                >
                  Bench
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {bench.map((slot, i) => (
                    <SlotRow key={i} slot={slot} />
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
