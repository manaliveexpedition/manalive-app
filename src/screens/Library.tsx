import { loadAllEntries } from '../lib/today'
import { DayBrowser } from './DayBrowser'

// Admin-only: every Daily (all 30 days, regardless of start_date), read-only,
// so John can click into any day and read or listen. Gated to admins in App.tsx.
export function Library() {
  return <DayBrowser title="All Dailies" loadEntries={loadAllEntries} feedback={false} />
}
