/**
 * The report queue.
 *
 * "No listing is removed automatically" is a promise in the product copy,
 * which means an admin queue has to exist and somebody has to open it. This
 * is that queue; /admin/review renders it.
 *
 * Reports are written to the Report table wherever there is a database.
 * They used to live only in memory, and on serverless that meant a report
 * was gone by the time anyone looked: the next request ran in a different
 * process.
 */
import { db, hasDatabase } from '@/core/db';

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

export async function fileReport(input: { reason: string; clusterId: string | null }): Promise<Report> {
  const reason = input.reason.slice(0, 200);
  if (hasDatabase()) {
    // A report against a cluster we do not hold is kept, without the link.
    const exists =
      input.clusterId === null
        ? null
        : await db().cluster.findUnique({ where: { id: input.clusterId }, select: { id: true } });
    const row = await db().report.create({
      data: { reason, clusterId: exists === null ? null : exists.id },
    });
    return toReport(row);
  }

  seq += 1;
  const r: Report = {
    id: `r${seq}`,
    clusterId: input.clusterId,
    reason,
    filedAt: Date.now(),
    status: 'open',
    outcomeNote: null,
  };
  reports.push(r);
  return r;
}

export async function openReports(): Promise<Report[]> {
  if (hasDatabase()) {
    const rows = await db().report.findMany({
      where: { status: 'open' },
      orderBy: { filedAt: 'asc' },
      take: 200,
    });
    return rows.map(toReport);
  }
  return reports.filter((r) => r.status === 'open').sort((a, b) => a.filedAt - b.filedAt);
}

/**
 * Close a report. "takedown" marks every live listing in the cluster gone,
 * which removes it from search; "dismiss" leaves the listing alone.
 */
export async function resolveReport(
  id: string,
  outcome: 'takedown' | 'dismiss',
  note: string | null,
): Promise<boolean> {
  if (!hasDatabase()) {
    const r = reports.find((x) => x.id === id);
    if (r === undefined) return false;
    r.status = outcome === 'takedown' ? 'actioned' : 'dismissed';
    r.outcomeNote = note;
    return true;
  }

  const row = await db().report.findUnique({ where: { id } });
  if (row === null || row.status !== 'open') return false;

  const now = new Date();
  if (outcome === 'takedown' && row.clusterId !== null) {
    const live = await db().listing.findMany({
      where: { clusterId: row.clusterId, goneAt: null },
      select: { id: true },
    });
    for (const l of live) {
      await db().listing.update({ where: { id: l.id }, data: { goneAt: now } });
      await db().listingEvent.create({
        data: { listingId: l.id, clusterId: row.clusterId, kind: 'taken_down', at: now },
      });
    }
  }

  await db().report.update({
    where: { id },
    data: {
      status: outcome === 'takedown' ? 'actioned' : 'dismissed',
      outcomeNote: note,
      actionedAt: now,
    },
  });
  return true;
}

function toReport(row: {
  id: string;
  clusterId: string | null;
  reason: string;
  filedAt: Date;
  status: 'open' | 'actioned' | 'dismissed';
  outcomeNote: string | null;
}): Report {
  return {
    id: row.id,
    clusterId: row.clusterId,
    reason: row.reason,
    filedAt: row.filedAt.getTime(),
    status: row.status,
    outcomeNote: row.outcomeNote,
  };
}
