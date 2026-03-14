import { createTheme } from '@mui/material/styles'

/**
 * “Night field” — deep slate + turf green + stadium gold.
 * Import: import { theme } from '@/theme'
 */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2d6a4f',
      light: '#40916c',
      dark: '#1b4332',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#d4a574',
      light: '#e8c9a8',
      dark: '#a67c52',
      contrastText: '#0f1419',
    },
    background: {
      default: '#0c0f12',
      paper: '#141a21',
    },
    text: {
      primary: '#e8edf4',
      secondary: '#94a3b8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(45, 106, 79, 0.18), transparent)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          minHeight: 56,
          transition: 'color 0.2s, background-color 0.2s',
        },
      },
    },
  },
})
