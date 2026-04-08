import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import PositionToggle from '@/components/PositionToggle'

export default function TopWaiverColumn() {
  const [position, setPosition] = useState('QB')

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Top Waiver Players Available
      </Typography>
      <PositionToggle value={position} onChange={setPosition} sx={{ mb: 2 }} />
    </Box>
  )
}
