/**
 * The report queue.
 *
 * "No listing is removed automatically" is a promise in the product copy,
 * which means an admin queue has to exist and somebody has to open it. This
 * is that queue; /admin/reports renders it.
 */
export interface Report {
  id: string;
  clusterId: string | null;
  reason: string;
  filedAt: number;
  status: 'open' | 'actioned' | 'dismissed';
  outcomeNote: string | null;
}

const reports: Report[] = [];
let seq = 0;

export function fileReport(input: { reason: string; clusterId: string | null }): Report {
  seq += 1;
  const r: Report = {
    id: `r${seq}`,
    clusterId: input.clusterId,
    reason: input.reason,
    filedAt: Date.now(),
    status: 'open',
    outcomeNote: null,
  };
  reports.push(r);
  return r;
}

export function openReports(): Report[] {
  return reports.filter((r) => r.status === 'open').sort((a, b) => a.filedAt - b.filedAt);
}

export function allReports(): Report[] {
  return [...reports].sort((a, b) => b.filedAt - a.filedAt);
}
