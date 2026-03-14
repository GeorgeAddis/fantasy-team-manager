import { Box, Typography } from '@mui/material'

export default function OverviewPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom color="secondary.main">
        Overview
      </Typography>
      <Typography color="text.secondary" paragraph>
        Sample overview copy — season snapshot, quick stats, and what matters
        this week will live here. Page-specific components go in{' '}
        <code>src/pages/Overview/</code>.
      </Typography>
    </Box>
  )
}
