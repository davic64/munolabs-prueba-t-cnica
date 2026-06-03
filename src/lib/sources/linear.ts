import type { ClientId, SearchInput, SourceRecord } from './types';

const LINEAR_URL = 'https://api.linear.app/graphql';

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.LINEAR_API_KEY!,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: unknown };
  if (json.errors) throw new Error(`Linear GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// Map ClientId → Linear Project/Team name (case-insensitive substring match).
function projectFilterForClient(clientId: ClientId): string {
  return clientId; // user creates Linear projects literally named "acme", "beta", "gamma"
}

export const linear = {
  async search(input: SearchInput): Promise<SourceRecord[]> {
    const projectName = projectFilterForClient(input.client_id);
    const query = `
      query Issues($projectName: String!, $first: Int!) {
        issues(filter: { project: { name: { containsIgnoreCase: $projectName } } }, first: $first, orderBy: updatedAt) {
          nodes {
            id identifier title description state { name } updatedAt url
            assignee { name }
          }
        }
      }
    `;
    const data = await gql<{ issues: { nodes: any[] } }>(query, {
      projectName,
      first: 20,
    });
    let nodes = data.issues.nodes;
    if (input.since) nodes = nodes.filter((n) => n.updatedAt >= input.since!);
    if (input.query) {
      const q = input.query.toLowerCase();
      nodes = nodes.filter((n) =>
        `${n.title} ${n.description ?? ''}`.toLowerCase().includes(q),
      );
    }
    return nodes.map((n): SourceRecord => ({
      source: 'linear',
      client_id: input.client_id,
      timestamp: n.updatedAt,
      author: n.assignee?.name ?? 'unassigned',
      content: `${n.identifier} "${n.title}" → ${n.state.name}${n.description ? `. ${n.description.slice(0, 200)}` : ''}`,
      url: n.url,
      metadata: { identifier: n.identifier, state: n.state.name },
    }));
  },

  async createIssue(params: { client_id: ClientId; title: string; description?: string }): Promise<{ id: string; url: string; identifier: string }> {
    const teamQuery = `query { teams(first: 50) { nodes { id name } } }`;
    const teams = await gql<{ teams: { nodes: { id: string; name: string }[] } }>(teamQuery, {});
    const team = teams.teams.nodes.find((t) => t.name.toLowerCase().includes(params.client_id))
      ?? teams.teams.nodes[0];
    if (!team) throw new Error('No Linear team found');
    const mutation = `
      mutation Create($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }
    `;
    const res = await gql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } } }>(
      mutation,
      { input: { teamId: team.id, title: params.title, description: params.description } },
    );
    if (!res.issueCreate.success) throw new Error('issueCreate failed');
    return res.issueCreate.issue;
  },
};
