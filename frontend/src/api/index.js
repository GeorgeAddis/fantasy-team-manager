/**
 * API layer — plain async functions (no React).
 * Import from 'src/api' or '@/api' per resource.
 */
export { apiFetch, ApiError, API_ROOT } from './client'
export * as leaguesApi from './leagues'
export * as teamsApi from './teams'
export * as irlFranchisesApi from './irlFranchises'
export * as playersApi from './players'
export * as lineupSlotsApi from './lineupSlots'

// Flat re-exports (optional convenience)
export {
  listLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  updateRosters,
} from './leagues'
export {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} from './teams'
export {
  listIrlFranchises,
  getIrlFranchise,
  createIrlFranchise,
  updateIrlFranchise,
  deleteIrlFranchise,
} from './irlFranchises'
export {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from './players'
export {
  listLineupSlots,
  getLineupSlot,
  createLineupSlot,
  updateLineupSlot,
  deleteLineupSlot,
} from './lineupSlots'
