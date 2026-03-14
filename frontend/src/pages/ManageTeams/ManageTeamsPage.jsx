import { Box, Typography } from '@mui/material'

export default function ManageTeamsPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom color="secondary.main">
        Manage Teams
      </Typography>
      <Typography color="text.secondary" paragraph>
        Roster edits, lineups, and league teams will live here. Add components
        under <code>src/pages/ManageTeams/</code>.
      </Typography>
    </Box>
  )
}
