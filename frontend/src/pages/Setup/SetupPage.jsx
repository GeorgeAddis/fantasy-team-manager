import { useState } from 'react'
import {
  Autocomplete,
  Box,
  Card,
  CardActionArea,
  CardContent,
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
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadingIcon from '@mui/icons-material/Downloading'

import { useLeagueList } from '@/hooks/useLeagues'
import { useIrlFranchiseList } from '@/hooks/useIrlFranchises'
import { usePlayerList, useImportPlayers, useImportFantraxIds } from '@/hooks/usePlayers'
import ImportPlayersDialog from '@/components/ImportPlayersDialog'
import ImportFantraxIdsDialog from '@/components/ImportFantraxIdsDialog'

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
  const [importOpen, setImportOpen] = useState(false)
  const [fantraxImportOpen, setFantraxImportOpen] = useState(false)
  const importMutation = useImportPlayers()
  const fantraxImportMutation = useImportFantraxIds()

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
    if (next === 'import') {
      importMutation.reset()
      setImportOpen(true)
      return
    }
    if (next === 'import-fantrax') {
      fantraxImportMutation.reset()
      setFantraxImportOpen(true)
      return
    }
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
    if (entity === 'player') return `${opt.name} — ${(opt.positions ?? []).join(', ')}`
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
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ──── Sidebar — stretches full height of content area ──── */}
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
          gap: 0,
          overflowY: 'auto',
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
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
              {entity === 'player' && (
                <ToggleButton value="import">
                  <UploadFileIcon sx={{ mr: 1, fontSize: 18, color: 'common.white' }} />
                  Import Players
                </ToggleButton>
              )}
              {entity === 'player' && (
                <ToggleButton value="import-fantrax">
                  <DownloadingIcon sx={{ mr: 1, fontSize: 18, color: 'common.white' }} />
                  Import Fantrax IDs
                </ToggleButton>
              )}
            </ToggleButtonGroup>

            {mode === 'edit' && entity === 'league' && (
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

      {/* ──── Main form area (scrolls independently) ──── */}
      <Box sx={{ flex: 1, minWidth: 0, p: 3, overflow: 'auto' }}>
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

      <ImportPlayersDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(file, clear, skip) => importMutation.mutate({ file, clearExisting: clear, skipExisting: skip })}
        isLoading={importMutation.isPending}
        result={importMutation.data}
        error={importMutation.error}
      />

      <ImportFantraxIdsDialog
        open={fantraxImportOpen}
        onClose={() => setFantraxImportOpen(false)}
        onImport={() => fantraxImportMutation.mutate()}
        isLoading={fantraxImportMutation.isPending}
        result={fantraxImportMutation.data}
        error={fantraxImportMutation.error}
      />
    </Box>
  )
}
