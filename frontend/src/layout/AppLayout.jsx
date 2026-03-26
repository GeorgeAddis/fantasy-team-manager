import { AppBar, Box, Tab, Tabs, Toolbar, Typography } from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const ROUTES = [
  { path: '/', label: 'Overview' },
  { path: '/manage-teams', label: 'Manage Teams' },
  { path: '/update-teams', label: 'Update Teams' },
  { path: '/rankings', label: 'Rankings' },
  { path: '/setup', label: 'Setup' },
]

function tabIndexFromPath(pathname) {
  const i = ROUTES.findIndex((r) => r.path === pathname)
  return i >= 0 ? i : 0
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const value = tabIndexFromPath(pathname === '' ? '/' : pathname)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            pl: 0,
            pr: 0,
            minHeight: { xs: 56, sm: 64 },
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            width: '100%',
          }}
        >
          {/* Title — matches sidebar width (260px) */}
          <Box
            sx={{
              width: 260,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: (t) =>
                  `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Fantasy Manager
            </Typography>
          </Box>

          {/* Tabs — equal share of remaining width */}
          <Tabs
            value={value}
            onChange={(_, i) => navigate(ROUTES[i].path)}
            variant="fullWidth"
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 56,
              px: 0,
              '& .MuiTabs-scroller': { overflow: 'visible !important' },
              '& .MuiTabs-flexContainer': {
                height: '100%',
                width: '100%',
              },
              '& .MuiTab-root': {
                flex: '1 1 0',
                minWidth: 0,
                maxWidth: 'none',
                px: 0,
                mx: 0,
                borderRadius: 0,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'secondary.main',
                  bgcolor: 'rgba(212, 165, 116, 0.12)',
                  boxShadow: (t) =>
                    `inset 0 -3px 0 ${t.palette.secondary.main}`,
                },
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            {ROUTES.map((r) => (
              <Tab key={r.path} label={r.label} disableRipple />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
