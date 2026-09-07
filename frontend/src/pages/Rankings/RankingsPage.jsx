import { useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  Typography,
} from '@mui/material'
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek'
import EventIcon from '@mui/icons-material/Event'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DefenseWeekByWeekPanel from './DefenseWeekByWeekPanel'
import ScoringRankingsPanel from './ScoringRankingsPanel'

const MODES = [
  { key: 'week', label: 'Week', icon: CalendarViewWeekIcon },
  { key: 'season', label: 'Season', icon: EventIcon },
  { key: 'waiver', label: 'Waiver Wire', icon: SwapHorizIcon },
]

const SCORING_SECTIONS = [
  { key: 'ppr', label: 'PPR Rankings' },
  { key: 'non_ppr', label: 'Rankings' },
]

const DEF_SECTION = {
  key: 'def',
  label: 'DEF Rankings',
  modes: [
    { key: 'week_by_week', label: 'Week by Week', icon: CalendarViewWeekIcon },
  ],
}

export default function RankingsPage() {
  const [section, setSection] = useState('ppr')
  const [mode, setMode] = useState('week')
  const isDef = section === 'def'

  function selectMode(nextSection, nextMode) {
    setSection(nextSection)
    setMode(nextMode)
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
          gap: 2,
        }}
      >
        {SCORING_SECTIONS.map((scoringSection) => (
          <Box key={scoringSection.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6" color="secondary.main">
              {scoringSection.label}
            </Typography>

            {MODES.map(({ key, label, icon: Icon }) => {
              const selected = section === scoringSection.key && mode === key
              return (
                <Card
                  key={`${scoringSection.key}-${key}`}
                  variant="outlined"
                  sx={{
                    borderColor: selected ? 'secondary.main' : 'divider',
                    bgcolor: selected ? 'rgba(212,165,116,0.08)' : 'transparent',
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                >
                  <CardActionArea
                    onClick={() => selectMode(scoringSection.key, key)}
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
          </Box>
        ))}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="h6" color="secondary.main">
            {DEF_SECTION.label}
          </Typography>
          {DEF_SECTION.modes.map(({ key, label, icon: Icon }) => {
            const selected = section === DEF_SECTION.key && mode === key
            return (
              <Card
                key={`${DEF_SECTION.key}-${key}`}
                variant="outlined"
                sx={{
                  borderColor: selected ? 'secondary.main' : 'divider',
                  bgcolor: selected ? 'rgba(212,165,116,0.08)' : 'transparent',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
              >
                <CardActionArea
                  onClick={() => selectMode(DEF_SECTION.key, key)}
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
        </Box>
        <Box sx={{ flex: 1 }} />
      </Box>

      {isDef
        ? <DefenseWeekByWeekPanel />
        : <ScoringRankingsPanel scoring={section} mode={mode} />}
    </Box>
  )
}
