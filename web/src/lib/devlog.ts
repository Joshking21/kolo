export type DevLogEntry = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined> | undefined;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  status: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  isMock: boolean;
  isReplayed: boolean;
  hasIdempotencyKey: boolean;
  idempotencyKey?: string | undefined;
  curlCommand: string;
};

export type DevSettings = {
  doubleSend: boolean;
  slowNetwork: boolean;
};

const DEV_SETTINGS_STORAGE_KEY = 'kolo-dev-settings';

function loadDevSettings(): DevSettings {
  try {
    const raw = localStorage.getItem(DEV_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        doubleSend: Boolean(parsed.doubleSend),
        slowNetwork: Boolean(parsed.slowNetwork),
      };
    }
  } catch {
    // ignore
  }
  return { doubleSend: false, slowNetwork: false };
}

let devSettings: DevSettings = loadDevSettings();
const settingsListeners = new Set<(settings: DevSettings) => void>();

export function getDevSettings(): DevSettings {
  return { ...devSettings };
}

export function updateDevSettings(partial: Partial<DevSettings>): void {
  devSettings = { ...devSettings, ...partial };
  try {
    localStorage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(devSettings));
  } catch {
    // ignore
  }
  settingsListeners.forEach((fn) => fn(devSettings));
}

export function subscribeDevSettings(listener: (settings: DevSettings) => void): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

const MAX_LOGS = 200;
const devLogs: DevLogEntry[] = [];
const logListeners = new Set<(logs: DevLogEntry[]) => void>();

export function getDevLogs(): DevLogEntry[] {
  return [...devLogs];
}

export function addDevLog(entry: DevLogEntry): void {
  devLogs.unshift(entry);
  if (devLogs.length > MAX_LOGS) {
    devLogs.pop();
  }
  const snapshot = [...devLogs];
  logListeners.forEach((fn) => fn(snapshot));
}

export function clearDevLogs(): void {
  devLogs.length = 0;
  logListeners.forEach((fn) => fn([]));
}

export function subscribeDevLogs(listener: (logs: DevLogEntry[]) => void): () => void {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
}
