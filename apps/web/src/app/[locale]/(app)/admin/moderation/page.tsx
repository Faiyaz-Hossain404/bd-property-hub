import { ModerationSection } from "@/components/dashboard/moderation-section"

// Listing moderation queue + removed listings (MOD-1/MOD-3). Reuses the existing
// section, now living under /admin instead of the shared dashboard.
export default function AdminModerationPage() {
  return <ModerationSection />
}
