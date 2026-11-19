import { useState, useEffect } from 'react';
import { DevLogEntry, getDevLogs, subscribeDevLogs, clearDevLogs } from '../../lib/devlog';
import { CopyButton } from '../ui/CopyButton';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

export function RequestLog() {
  const [logs, setLogs] = useState<DevLogEntry[]>(() => getDevLogs());
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDevLogs((updated) => setLogs(updated));
  }, []);

  const filteredLogs = logs.filter((l) =>
    l.path.toLowerCase().includes(filter.toLowerCase().trim())
  );

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-success bg-success-soft';
    if (status >= 400 && status < 500) return 'text-warning bg-warning-soft';
    return 'text-danger bg-danger-soft';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header filter / clear */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
        <input
          type="text"
          placeholder="Filter by path..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 h-9 rounded-lg border border-border bg-surface px-3 text-[13px] outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => clearDevLogs()}
          title="Clear request log"
          aria-label="Clear request log"
          className="h-9 px-3 rounded-lg border border-border bg-surface text-muted hover:text-danger hover:bg-surface-muted transition flex items-center gap-1.5 text-[12px] font-semibold"
        >
          <Trash2 size={14} />
          <span>Clear</span>
        </button>
      </div>

      {/* Log list */}
      {filteredLogs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[13px] text-muted">
          No requests recorded yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-border -mx-4 px-4">
          {filteredLogs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="py-2.5 text-[13px]">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center justify-between text-left gap-2 hover:bg-surface-muted/50 p-1.5 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronDown size={14} className="shrink-0 text-muted" /> : <ChevronRight size={14} className="shrink-0 text-muted" />}
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-surface-muted text-ink">
                      {entry.method}
                    </span>
                    <span className="font-mono truncate text-[12px] text-ink" title={entry.path}>
                      {entry.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.hasIdempotencyKey && (
                      <span className="rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 text-[10px] font-mono">
                        idem
                      </span>
                    )}
                    {entry.isReplayed && (
                      <span className="rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1 text-[10px] font-mono">
                        replayed
                      </span>
                    )}
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${getStatusColor(entry.status)}`}>
                      {entry.status || 'ERR'}
                    </span>
                    <span className="text-[11px] font-mono text-muted w-14 text-right">
                      {entry.durationMs}ms
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2.5 p-3 rounded-[10px] bg-surface-muted border border-border flex flex-col gap-3 font-mono text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">Request Details</span>
                      <CopyButton value={entry.curlCommand} label="Copy as curl" />
                    </div>

                    <div>
                      <span className="text-muted block mb-1 font-semibold">Request Headers</span>
                      <pre className="p-2 rounded bg-surface border border-border overflow-x-auto text-[11px]">
                        {JSON.stringify(entry.requestHeaders, null, 2)}
                      </pre>
                    </div>

                    {entry.requestBody !== undefined && (
                      <div>
                        <span className="text-muted block mb-1 font-semibold">Request Body</span>
                        <pre className="p-2 rounded bg-surface border border-border overflow-x-auto text-[11px]">
                          {JSON.stringify(entry.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div>
                      <span className="text-muted block mb-1 font-semibold">Response Headers</span>
                      <pre className="p-2 rounded bg-surface border border-border overflow-x-auto text-[11px]">
                        {JSON.stringify(
                          {
                            'x-request-id': entry.responseHeaders['x-request-id'],
                            'idempotent-replayed': entry.responseHeaders['idempotent-replayed'],
                            'retry-after': entry.responseHeaders['retry-after'],
                            'set-cookie': entry.responseHeaders['set-cookie'],
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>

                    <div>
                      <span className="text-muted block mb-1 font-semibold">Response Body</span>
                      <pre className="p-2 rounded bg-surface border border-border overflow-x-auto text-[11px] max-h-60 overflow-y-auto">
                        {JSON.stringify(entry.responseBody, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
