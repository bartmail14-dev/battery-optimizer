import Anthropic from '@anthropic-ai/sdk';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const AI_ENABLED = import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';
const MAX_MESSAGES = Number(import.meta.env.VITE_MAX_AI_MESSAGES_PER_SESSION) || 3;

/** Model selection: Haiku for fast/cheap tasks, Sonnet for complex analysis */
export const MODELS = {
  fast: 'claude-haiku-4-5-20251001',
  smart: 'claude-sonnet-4-5-20250929',
} as const;

export type ModelTier = keyof typeof MODELS;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

let sessionMessageCount = 0;
let sessionTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalCost: 0 };

// Approximate pricing (USD per million tokens, 2024)
const PRICING = {
  [MODELS.fast]: { input: 0.80, output: 4.00 },
  [MODELS.smart]: { input: 3.00, output: 15.00 },
};

function getClient(): Anthropic | null {
  if (!AI_ENABLED || !API_KEY) return null;
  return new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
}

/**
 * Check if AI features are available and within session limits.
 */
export function isAIAvailable(): boolean {
  return AI_ENABLED && !!API_KEY;
}

export function getRemainingMessages(): number {
  return Math.max(0, MAX_MESSAGES - sessionMessageCount);
}

export function getSessionUsage(): TokenUsage {
  return { ...sessionTokenUsage };
}

/**
 * Send a message to the Anthropic API.
 *
 * @param systemPrompt - System prompt for context
 * @param userMessage - User message
 * @param tier - Model tier: 'fast' (Haiku) or 'smart' (Sonnet)
 * @returns Response text or null if unavailable
 */
export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  tier: ModelTier = 'fast'
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  if (sessionMessageCount >= MAX_MESSAGES) {
    return null;
  }

  sessionMessageCount++;

  try {
    const model = MODELS[tier];
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Track usage
    const usage = response.usage;
    sessionTokenUsage.inputTokens += usage.input_tokens;
    sessionTokenUsage.outputTokens += usage.output_tokens;

    const pricing = PRICING[model];
    sessionTokenUsage.totalCost +=
      (usage.input_tokens / 1_000_000) * pricing.input +
      (usage.output_tokens / 1_000_000) * pricing.output;

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error) {
    console.error('AI request failed:', error);
    return null;
  }
}

/**
 * Send a streaming message to the Anthropic API.
 * Calls onChunk for each text delta.
 */
export async function sendMessageStreaming(
  systemPrompt: string,
  userMessage: string,
  tier: ModelTier = 'fast',
  onChunk: (text: string) => void
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  if (sessionMessageCount >= MAX_MESSAGES) {
    return null;
  }

  sessionMessageCount++;

  try {
    const model = MODELS[tier];
    let fullText = '';

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    const usage = finalMessage.usage;
    sessionTokenUsage.inputTokens += usage.input_tokens;
    sessionTokenUsage.outputTokens += usage.output_tokens;

    const pricing = PRICING[model];
    sessionTokenUsage.totalCost +=
      (usage.input_tokens / 1_000_000) * pricing.input +
      (usage.output_tokens / 1_000_000) * pricing.output;

    return fullText;
  } catch (error) {
    console.error('AI streaming request failed:', error);
    return null;
  }
}
