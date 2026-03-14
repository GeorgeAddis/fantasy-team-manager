import { Box, Typography } from '@mui/material'

export default function RankingsPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom color="secondary.main">
        Rankings
      </Typography>
      <Typography color="text.secondary" paragraph>
        Player / position rankings and filters will go here. Components in{' '}
        <code>src/pages/Rankings/</code>.
      </Typography>
    </Box>
  )
}
