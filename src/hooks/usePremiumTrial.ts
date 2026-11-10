import {useCallback, useEffect, useRef, useState} from 'react';
import {canExportPremium, loadTrialUsage, recordTrialPhoto, remainingTrial, saveTrialUsage, TRIAL_LIMIT, type TrialUsage} from '../store/premiumTrial';
import {useStoreBilling} from './useStoreBilling';

export function usePremiumTrial() {
  const billing = useStoreBilling();
  const usage = useRef<TrialUsage>({photoIds: []});
  const unsavedUsage = useRef<TrialUsage | null>(null);
  const [remaining, setRemaining] = useState(TRIAL_LIMIT);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [plansVisible, setPlansVisible] = useState(false);
  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      if (unsavedUsage.current) {
        await saveTrialUsage(unsavedUsage.current);
        unsavedUsage.current = null;
      }
      usage.current = await loadTrialUsage();
      setRemaining(remainingTrial(usage.current));
      setStatus('ready');
    } catch { setStatus('error'); }
  }, []);
  useEffect(() => {reload();}, [reload]);
  const requireAccess = useCallback((photoId?: string) => {
    if (billing.access.active) return true;
    if (status === 'ready' && (photoId ? canExportPremium(usage.current, photoId) : remainingTrial(usage.current) > 0)) return true;
    setPlansVisible(true);
    return false;
  }, [status, billing.access.active]);
  // Call only after a successful album save or completed share. Export callers serialize operations.
  const recordExport = useCallback(async (photoId: string) => {
    if (billing.access.active) return;
    const next = recordTrialPhoto(usage.current, photoId);
    usage.current = next;
    setRemaining(remainingTrial(next));
    unsavedUsage.current = next;
    try { await saveTrialUsage(next); unsavedUsage.current = null; }
    catch { setStatus('error'); throw new Error('無法保存體驗紀錄'); }
  }, [billing.access.active]);
  return {remaining, status, plansVisible, setPlansVisible, requireAccess, recordExport, reload, billing};
}
