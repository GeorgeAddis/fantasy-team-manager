import { ToggleButton, ToggleButtonGroup } from '@mui/material'

const POSITION_KEYS = ['QB', 'RB', 'WR', 'TE', 'RWT', 'DST', 'K']

export default function PositionToggle({ value, onChange, positions = POSITION_KEYS, sx }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, next) => next && onChange(next)}
      sx={{
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
        ...sx,
      }}
    >
      {positions.map((key) => (
        <ToggleButton key={key} value={key}>{key}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
