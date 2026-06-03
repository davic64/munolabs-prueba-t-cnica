import { fixtures } from './fixtures';
import type { SearchInput, Source, SourceRecord } from '../types';

export function mockSearch(source: Source, input: SearchInput): SourceRecord[] {
  let results = fixtures.filter((f) => f.source === source && f.client_id === input.client_id);
  if (input.since) results = results.filter((r) => r.timestamp >= input.since!);
  if (input.query) {
    const q = input.query.toLowerCase();
    results = results.filter((r) => r.content.toLowerCase().includes(q));
  }
  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
