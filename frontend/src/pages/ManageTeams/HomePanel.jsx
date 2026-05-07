import { useEffect, useState } from 'react'
import { Box, TextField, Typography } from '@mui/material'
import { useSettings, useUpdateSetting } from '@/hooks/useSettings'

export default function HomePanel() {
  const { data } = useSettings()
  const updateSetting = useUpdateSetting()

  const currentWeek = data?.data?.current_week ?? '0'
  const [week, setWeek] = useState(currentWeek)

  useEffect(() => {
    setWeek(currentWeek)
  }, [currentWeek])

  function handleWeekChange(e) {
    const val = e.target.value
    setWeek(val)

    const num = parseInt(val, 10)
    if (!Number.isNaN(num) && num >= 0 && num <= 17) {
      updateSetting.mutate({ key: 'current_week', value: num })
    }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
        Home
      </Typography>

      <TextField
        label="Current Week"
        type="number"
        size="small"
        value={week}
        onChange={handleWeekChange}
        inputProps={{ min: 0, max: 17 }}
        sx={{ width: 160 }}
      />
    </Box>
  )
}
