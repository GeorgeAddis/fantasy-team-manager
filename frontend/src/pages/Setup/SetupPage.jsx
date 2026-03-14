import { useState } from 'react'
import {
  Autocomplete,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Fade,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsFootballIcon from '@mui/icons-material/SportsFootball'
import GroupsIcon from '@mui/icons-material/Groups'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'

import { useLeagueList } from '@/hooks/useLeagues'
import { useIrlFranchiseList } from '@/hooks/useIrlFranchises'
import { usePlayerList } from '@/hooks/usePlayers'

import LeagueForm from './LeagueForm'
import IrlFranchiseForm from './IrlFranchiseForm'
import PlayerForm from './PlayerForm'

const ENTITIES = [
  { key: 'league', label: 'League', icon: EmojiEventsIcon },
  { key: 'irlFranchise', label: 'IRL Franchise', icon: GroupsIcon },
  { key: 'player', label: 'Player', icon: SportsFootballIcon },
]

export default function SetupPage() {
  const [entity, setEntity] = useState(null)
  const [mode, setMode] = useState('create')
  const [editRecord, setEditRecord] = useState(null)

  const leagueQuery = useLeagueList()
  const franchiseQuery = useIrlFranchiseList()
  const playerQuery = usePlayerList()

  function handleEntityChange(key) {
    setEntity(key)
    setMode('create')
    setEditRecord(null)
  }

  function handleModeChange(_, next) {
    if (!next) return
    setMode(next)
    setEditRecord(null)
  }

  function getRecords() {
    if (entity === 'league') return leagueQuery.data?.data ?? []
    if (entity === 'irlFranchise') return franchiseQuery.data?.data ?? []
    if (entity === 'player') return playerQuery.data?.data ?? []
    return []
  }

  function getOptionLabel(opt) {
    if (!opt) return ''
    if (entity === 'irlFranchise')
      return `${opt.name} (${opt.abbreviated_name})`
    if (entity === 'player') return `${opt.name} — ${opt.position}`
    return opt.name
  }

  function handleSaved() {
    setEditRecord(null)
    if (mode === 'create') setMode('create')
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      {/* ──── Sidebar — full viewport height, spacer below controls ──── */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          minHeight: 'calc(100vh - 64px)',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          gap: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 'calc(100vh - 64px - 96px)',
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
        <Typography variant="h6" color="secondary.main" sx={{ mb: 0.5 }}>
          Setup
        </Typography>

        {ENTITIES.map(({ key, label, icon: Icon }) => {
          const selected = entity === key
          return (
            <Card
              key={key}
              variant="outlined"
              sx={{
                borderColor: selected ? 'secondary.main' : 'divider',
                bgcolor: selected
                  ? 'rgba(212,165,116,0.08)'
                  : 'transparent',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
            >
              <CardActionArea
                onClick={() => handleEntityChange(key)}
                sx={{ py: 1.5, px: 2, display: 'flex', justifyContent: 'flex-start', gap: 1.5 }}
              >
                <Icon
                  sx={{
                    fontSize: 22,
                    color: selected ? 'secondary.main' : 'text.secondary',
                  }}
                />
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color={selected ? 'secondary.main' : 'text.primary'}
                >
                  {label}
                </Typography>
              </CardActionArea>
            </Card>
          )
        })}

        {entity && (
          <>
            <Divider sx={{ my: 0.5 }} />

            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={handleModeChange}
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
              <ToggleButton value="create">
                <AddIcon sx={{ mr: 1, fontSize: 18 }} />
                Create New
              </ToggleButton>
              <ToggleButton value="edit">
                <EditIcon sx={{ mr: 1, fontSize: 18 }} />
                Edit Existing
              </ToggleButton>
            </ToggleButtonGroup>

            {mode === 'edit' && (
              <Autocomplete
                size="small"
                options={getRecords()}
                getOptionLabel={getOptionLabel}
                value={editRecord}
                onChange={(_, val) => setEditRecord(val)}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Select ${ENTITIES.find((e) => e.key === entity)?.label}`}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      {entity === 'irlFranchise' && (
                        <Chip
                          label={option.abbreviated_name}
                          size="small"
                          sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                        />
                      )}
                      {entity === 'player' && (
                        <Chip
                          label={option.position}
                          size="small"
                          sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>
                  </li>
                )}
              />
            )}
          </>
        )}
        </Box>

        {/* Fills rest of sidebar — same paper bg */}
        <Box sx={{ flex: 1, minHeight: 96 }} aria-hidden />
      </Box>

      {/* ──── Main form area ──── */}
      <Box sx={{ flex: 1, minWidth: 0, p: 3 }}>
        {!entity && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6">
              Select an entity type from the sidebar to get started.
            </Typography>
          </Box>
        )}

        {entity && (
          <Fade in key={`${entity}-${mode}-${editRecord?.id ?? 'new'}`}>
            <Box>
              {entity === 'league' && (
                <LeagueForm
                  mode={mode}
                  record={mode === 'edit' ? editRecord : null}
                  onSaved={handleSaved}
                />
              )}
              {entity === 'irlFranchise' && (
                <IrlFranchiseForm
                  mode={mode}
                  record={mode === 'edit' ? editRecord : null}
                  onSaved={handleSaved}
                />
              )}
              {entity === 'player' && (
                <PlayerForm
                  mode={mode}
                  record={mode === 'edit' ? editRecord : null}
                  onSaved={handleSaved}
                />
              )}
            </Box>
          </Fade>
        )}
      </Box>
    </Box>
  )
}
