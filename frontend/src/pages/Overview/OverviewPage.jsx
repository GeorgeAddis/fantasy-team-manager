import { useState } from 'react'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import WavingHandIcon from '@mui/icons-material/WavingHand'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import PlayerExposurePanel from './PlayerExposurePanel'

const SECTIONS = [
  { value: 'welcome', label: 'Welcome', icon: WavingHandIcon },
  { value: 'player-exposure', label: 'Player Exposure', icon: DonutLargeIcon },
]

function WelcomePanel() {
  return (
    <Box sx={{ maxWidth: 640, pt: 1 }}>
      <Typography
        variant="h4"
        color="secondary.main"
        sx={{ fontWeight: 700, mb: 1.5 }}
      >
        Welcome
      </Typography>
      <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500, mb: 2, lineHeight: 1.4 }}>
        Your fantasy football command centre.
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
        Use the sidebar to jump between overview tools. Start with Player Exposure to see
        how often each of your players shows up across all of your teams.
      </Typography>
    </Box>
  )
}

export default function OverviewPage() {
  const [section, setSection] = useState('welcome')

  function handleSectionChange(_, next) {
    if (next != null) setSection(next)
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: '100%', overflow: 'hidden' }}>
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
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" color="secondary.main" sx={{ mb: 0.5 }}>
            Overview
          </Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={section}
            onChange={handleSectionChange}
            orientation="vertical"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                justifyContent: 'flex-start',
                px: 2,
                '&.Mui-selected': {
                  bgcolor: 'rgba(212,165,116,0.15)',
                  color: 'secondary.main',
                  borderColor: 'secondary.main',
                },
              },
            }}
          >
            {SECTIONS.map(({ value, label, icon: Icon }) => (
              <ToggleButton key={value} value={value}>
                <Icon sx={{ mr: 1, fontSize: 18 }} />
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, p: 3, overflowY: 'auto' }}>
        {section === 'welcome' && <WelcomePanel />}
        {section === 'player-exposure' && <PlayerExposurePanel />}
      </Box>
    </Box>
  )
}
