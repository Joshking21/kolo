import { useState, useEffect } from 'react';
import { getDevSettings, updateDevSettings, subscribeDevSettings } from '../../lib/devlog';
import { setAccessToken } from '../../lib/auth/token-store';
import { devRunDueRoundsApi } from '../../lib/api/dev';
import { clearDbStorage } from '../../mocks/db';
import { seedMockDb } from '../../mocks/seed';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export function DevSettings() {
  const [settings, setSettings] = useState(() => getDevSettings());
  const [jobResult, setJobResult] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  useEffect(() => {
    return subscribeDevSettings((updated) => setSettings(updated));
  }, []);

  const rawMockDomains = import.meta.env.VITE_MOCK_DOMAINS || '';
  const mockDomains = rawMockDomains
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const allDomains = ['auth', 'groups', 'wallet', 'payments', 'notifications', 'dev'];

  const handleExpireToken = () => {
    // Set expired token: exp in past
    const expiredHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
    const expiredPayload = btoa(
      JSON.stringify({
        sub: 'expired_user',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800,
      })
    ).replace(/=/g, '');
    const expiredSig = btoa('mock_sig').replace(/=/g, '');
    setAccessToken(`${expiredHeader}.${expiredPayload}.${expiredSig}`);
    toast.info('Access token has been expired. Next request will trigger silent refresh.');
  };

  const handleRunJob = async () => {
    setRunningJob(true);
    setJobResult(null);
    try {
      const res = await devRunDueRoundsApi();
      setJobResult(JSON.stringify(res, null, 2));
      toast.success('Due rounds background job completed');
    } catch {
      toast.error('Failed to run due rounds job');
    } finally {
      setRunningJob(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all mock data to initial seed? You will be logged out.')) {
      clearDbStorage();
      seedMockDb();
      localStorage.removeItem('kolo-mock-db-v1');
      window.location.assign('/login');
    }
  };

  return (
    <div className="flex flex-col gap-6 text-[14px]">
      {/* API Mode */}
      <div className="flex flex-col gap-2">
        <h4 className="font-semibold text-ink">API Mode</h4>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {allDomains.map((domain) => {
            const isMocked = mockDomains.includes(domain);
            return (
              <div key={domain} className="flex items-center justify-between px-3.5 py-2">
                <span className="font-mono text-[13px]">{domain}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    isMocked
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {isMocked ? 'Mock' : 'Live'}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-muted">
          Change <code className="font-mono">VITE_MOCK_DOMAINS</code> in <code className="font-mono">web/.env.local</code> and restart the dev server.
        </p>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-ink">Testing Toggles</h4>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface cursor-pointer">
          <input
            type="checkbox"
            checked={settings.doubleSend}
            onChange={(e) => updateDevSettings({ doubleSend: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-ink">
              Double-send money requests
            </span>
            <span className="text-[12px] text-muted leading-relaxed">
              Sends every payment request twice at the same instant, with the same Idempotency-Key. Use it to watch idempotency protect you.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface cursor-pointer">
          <input
            type="checkbox"
            checked={settings.slowNetwork}
            onChange={(e) => updateDevSettings({ slowNetwork: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-ink">
              Slow network (+1.5s)
            </span>
            <span className="text-[12px] text-muted leading-relaxed">
              Adds a 1500 ms artificial delay before every client request.
            </span>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-ink">Simulations</h4>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExpireToken}
        >
          Expire access token now
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={runningJob}
          onClick={handleRunJob}
        >
          Run due-rounds job now
        </Button>

        {jobResult && (
          <pre className="p-2.5 rounded-lg bg-surface-muted text-[11px] font-mono overflow-x-auto border border-border">
            {jobResult}
          </pre>
        )}

        {mockDomains.length > 0 && (
          <div className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleResetData}
              className="w-full"
            >
              Reset mock data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
