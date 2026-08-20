/** Central query keys — invalidation & caching */
export const queryKeys = {
  leagues: {
    all: ['leagues'],
    list: (params) => ['leagues', 'list', params],
    detail: (id) => ['leagues', 'detail', id],
  },
  teams: {
    all: ['teams'],
    list: (params) => ['teams', 'list', params],
    detail: (id) => ['teams', 'detail', id],
    roster: (id) => ['teams', 'roster', id],
  },
  irlFranchises: {
    all: ['irl-franchises'],
    list: (params) => ['irl-franchises', 'list', params],
    detail: (id) => ['irl-franchises', 'detail', id],
  },
  players: {
    all: ['players'],
    list: (params) => ['players', 'list', params],
    detail: (id) => ['players', 'detail', id],
    stats: ['players', 'stats'],
    searchMyTeams: (params) => ['players', 'searchMyTeams', params],
    exposure: ['players', 'exposure'],
    doNotRoster: ['players', 'doNotRoster'],
    doNotRosterTeams: ['players', 'doNotRosterTeams'],
  },
  settings: {
    all: ['settings'],
  },
  lineupSlots: {
    all: ['lineup-slots'],
    list: (params) => ['lineup-slots', 'list', params],
    detail: (id) => ['lineup-slots', 'detail', id],
  },
}
