export function trialReminderDue(access: {active: boolean; trial: boolean; expiresAt: string | null}, now = Date.now()): number | null {
  if (!access.active || !access.trial || !access.expiresAt) return null;
  const expiry = Date.parse(access.expiresAt);
  return Number.isFinite(expiry) && expiry > now ? expiry - 24 * 60 * 60 * 1000 : null;
}
