import { auth } from '@/lib/auth';
import { buildTools } from '@/lib/agent/tools';
import { systemPrompt } from '@/lib/agent/prompt';
import { accessibleClients } from '@/lib/agent/access';
import { deepseek } from '@ai-sdk/deepseek';
import { headers } from 'next/headers';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages, chatSessionId }: { messages: UIMessage[]; chatSessionId?: string } = await req.json();
  const userId = session.user.id;
  const clients = await accessibleClients(userId);

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt(clients),
    messages: modelMessages,
    tools: buildTools(userId, chatSessionId ?? null),
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
