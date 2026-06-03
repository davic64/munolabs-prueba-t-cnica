/** Server-side aggregator: builds a rich client profile from Linear (real),
 *  Notion (real) and the 8 mocked sources. Used by /api/clients/[id].
 */
import type { ClientId, SourceRecord } from '@/lib/sources/types';
import { linear } from '@/lib/sources/linear';
import { notion } from '@/lib/sources/notion';
import { slack } from '@/lib/sources/mocks/slack';
import { granola } from '@/lib/sources/mocks/granola';
import { gcal } from '@/lib/sources/mocks/gcal';
import { gdrive } from '@/lib/sources/mocks/gdrive';
import { github } from '@/lib/sources/mocks/github';
import { obsidian } from '@/lib/sources/mocks/obsidian';
import { posthog } from '@/lib/sources/mocks/posthog';
import { whatsapp } from '@/lib/sources/mocks/whatsapp';

export type ClientMeta = {
  id: string;
  name: string;
  industry: string;
  contact: { name: string; role: string; email: string };
  status: 'active' | 'paused' | 'at-risk';
  contractValue: string;
  startedAt: string;
  metrics: { label: string; value: string; trend?: 'up' | 'down' | 'flat' }[];
  recentActivity: { source: string; ts: string; text: string; url?: string }[];
  links: { label: string; url: string }[];
  counts: {
    linear: number;
    notion: number;
    slack: number;
    granola: number;
    gcal: number;
    gdrive: number;
    github: number;
    obsidian: number;
    posthog: number;
    whatsapp: number;
  };
};

// Static profile data (from CRM/onboarding — not in integrated tools).
const PROFILE: Record<string, Pick<ClientMeta, 'name' | 'industry' | 'contact' | 'contractValue' | 'startedAt'>> = {
  acme: {
    name: 'Acme',
    industry: 'SaaS B2B · Growth',
    contact: { name: 'Carlos Méndez', role: 'Head of Growth', email: 'carlos@acme.co' },
    contractValue: 'USD 12,500 / mes',
    startedAt: '2026-02-14',
  },
  beta: {
    name: 'Beta',
    industry: 'Fintech · Onboarding',
    contact: { name: 'Laura Ortiz', role: 'Product Lead', email: 'laura@beta.io' },
    contractValue: 'USD 8,000 / mes',
    startedAt: '2026-05-25',
  },
  gamma: {
    name: 'Gamma',
    industry: 'Marketplace · Estrategia',
    contact: { name: 'Diego Ramírez', role: 'CEO', email: 'diego@gamma.mx' },
    contractValue: 'USD 6,500 / mes',
    startedAt: '2026-04-01',
  },
};

const SOURCES: Record<string, { search: (input: { client_id: ClientId }) => Promise<SourceRecord[]> }> = {
  linear, notion, slack, granola, gcal, gdrive, github, obsidian, posthog, whatsapp,
};

const SOURCE_LABEL: Record<string, string> = {
  linear: 'Linear', notion: 'Notion', slack: 'Slack', granola: 'Granola',
  gcal: 'Calendar', gdrive: 'Drive', github: 'GitHub', obsidian: 'Obsidian',
  posthog: 'PostHog', whatsapp: 'WhatsApp',
};

function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  return p.catch(() => fallback);
}

export async function buildClientMeta(clientId: string): Promise<ClientMeta | null> {
  const id = clientId.toLowerCase();
  const profile = PROFILE[id];
  if (!profile) return null;

  // Fan-out: query all sources in parallel.
  const sourceKeys = Object.keys(SOURCES);
  const results = await Promise.all(
    sourceKeys.map((k) => safe(SOURCES[k].search({ client_id: id as ClientId }), [] as SourceRecord[])),
  );
  const bySource: Record<string, SourceRecord[]> = {};
  sourceKeys.forEach((k, i) => { bySource[k] = results[i]; });

  // Counts.
  const counts = sourceKeys.reduce<Record<string, number>>((acc, k) => {
    acc[k] = bySource[k].length; return acc;
  }, {}) as ClientMeta['counts'];

  // Heuristics.
  const linearIssues = bySource.linear;
  const openIssues = linearIssues.filter((r) => {
    const state = (r.metadata as { state?: string } | undefined)?.state ?? '';
    return state && !['Done', 'Canceled', 'Duplicate'].includes(state);
  }).length;
  const blockedIssues = linearIssues.filter((r) => /block|bloque/i.test(r.content)).length;

  const latestPosthog = bySource.posthog[bySource.posthog.length - 1];
  const ctrMatch = latestPosthog?.content.match(/(\d+(?:\.\d+)?)\s*%/);
  const ctrValue = ctrMatch?.[1];
  const downMatch = latestPosthog?.content.match(/(-?\d+)\s*%/g)?.find((m) => m.includes('-'));

  const upcomingMeeting = bySource.gcal.find((r) => new Date(r.timestamp) >= new Date());
  const lastClientMsg = [...bySource.whatsapp, ...bySource.slack]
    .filter((r) => /cliente|client|carlos|laura|diego/i.test(r.author))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // Status heuristic.
  let status: ClientMeta['status'] = 'active';
  if (downMatch || lastClientMsg) status = 'at-risk';

  // Metrics.
  const metrics: ClientMeta['metrics'] = [
    { label: 'Issues abiertos', value: String(openIssues), trend: openIssues > 0 ? 'flat' : 'down' },
    { label: 'Bloqueados', value: String(blockedIssues), trend: blockedIssues > 0 ? 'up' : 'flat' },
    { label: 'Páginas Notion', value: String(counts.notion), trend: counts.notion > 0 ? 'up' : 'flat' },
  ];
  if (ctrValue) {
    metrics.push({ label: 'CTR landing', value: `${ctrValue}%`, trend: downMatch ? 'down' : 'up' });
  } else if (upcomingMeeting) {
    metrics.push({
      label: 'Próxima reunión',
      value: new Date(upcomingMeeting.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      trend: 'flat',
    });
  } else {
    metrics.push({ label: 'Mensajes cliente', value: String(counts.whatsapp + counts.slack), trend: 'flat' });
  }

  // Activity: merge all sources, sort desc, take top 8.
  const allRecords: SourceRecord[] = sourceKeys.flatMap((k) => bySource[k]);
  const recentActivity = allRecords
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8)
    .map((r) => ({
      source: SOURCE_LABEL[r.source] ?? r.source,
      ts: new Date(r.timestamp).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      text: r.content.length > 180 ? `${r.content.slice(0, 180)}…` : r.content,
      url: r.url,
    }));

  // Links from sources that returned a URL.
  const links: ClientMeta['links'] = [];
  const firstNotion = bySource.notion[0];
  if (firstNotion?.url) links.push({ label: 'Notion · Workspace', url: firstNotion.url });
  const firstLinear = bySource.linear[0];
  if (firstLinear?.url) {
    const projectUrl = firstLinear.url.replace(/\/issue\/.+$/, '');
    links.push({ label: 'Linear · Proyecto', url: projectUrl });
  }
  const firstPosthog = bySource.posthog[0];
  if (firstPosthog?.url) links.push({ label: 'PostHog · Dashboard', url: firstPosthog.url });

  return {
    id,
    ...profile,
    status,
    metrics,
    recentActivity,
    links,
    counts,
  };
}

// Legacy client-side getter (still used by old imports — returns null now since
// the rich profile requires server access. Kept to avoid breaking imports.)
export function getClientMeta(_id: string): ClientMeta | null {
  return null;
}
