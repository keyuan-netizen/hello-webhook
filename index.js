require('dotenv').config();

const express = require('express');
const app = express();

const fetch =
  global.fetch ||
  ((...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args)));

const PROVIDERS = {
  claude: translateWithClaude,
  xai: translateWithXai
};

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  next(err);
});

app.post('/', async (req, res) => {
  const { provider, prompt, metadata } = req.body || {};

  const cleanedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  const rawProvider = typeof provider === 'string' ? provider.trim() : '';
  const requestedProvider = rawProvider.toLowerCase();
  const normalizedProvider =
    rawProvider === '' ? 'xai' : Object.prototype.hasOwnProperty.call(PROVIDERS, requestedProvider) ? requestedProvider : null;

  if (!cleanedPrompt) {
    return res.status(400).json({ error: 'Missing prompt text to translate.' });
  }

  if (!normalizedProvider) {
    return res.status(400).json({
      error: `Unsupported provider "${rawProvider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`
    });
  }

  const translator = PROVIDERS[normalizedProvider];

  try {
    const translation = await translator({
      prompt: cleanedPrompt,
      metadata: metadata || {}
    });
    res.json({ translation, prompt: cleanedPrompt });
  } catch (err) {
    console.error(`[${normalizedProvider}] translation error`, err);
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 502;
    res.status(status).json({ error: err.publicMessage || 'Translation failed. Check server logs for details.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Translation webhook listening on ${port}`));

function createSystemPrompt(metadata) {
  const base = 'You are a translation assistant. Translate the user input according to their instructions and return only the translated text.';
  if (metadata && Object.keys(metadata).length) {
    return `${base} Additional metadata (JSON): ${JSON.stringify(metadata)}`;
  }
  return base;
}

async function translateWithXai({ prompt, metadata }) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw createConfigError('XAI_API_KEY', 'xAI');
  }

  const model = process.env.XAI_MODEL || 'grok-1';
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: createSystemPrompt(metadata) },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw createProviderError('xAI', response.status, payload);
  }

  const translation = extractMessageText(payload?.choices?.[0]?.message?.content);
  if (!translation) {
    throw createProviderError('xAI', 502, payload, 'No translation text returned from xAI.');
  }

  return translation;
}

async function translateWithClaude({ prompt, metadata }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw createConfigError('ANTHROPIC_API_KEY', 'Claude');
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024,
      temperature: 0.2,
      system: createSystemPrompt(metadata),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw createProviderError('Claude', response.status, payload);
  }

  const translation = extractAnthropicText(payload?.content);
  if (!translation) {
    throw createProviderError('Claude', 502, payload, 'No translation text returned from Claude.');
  }

  return translation;
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

function extractMessageText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        if (part && typeof part.content === 'string') return part.content;
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text.trim();
    if (typeof content.content === 'string') return content.content.trim();
  }
  return '';
}

function extractAnthropicText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .map(block => (block && typeof block.text === 'string' ? block.text : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
}

function createProviderError(provider, statusCode, payload, message) {
  const error = new Error(message || `${provider} API request failed.`);
  error.statusCode = statusCode;
  error.publicMessage = message || `${provider} API request failed with status ${statusCode}.`;
  error.details = payload;
  return error;
}

function createConfigError(envVar, provider) {
  const error = new Error(`${envVar} is not configured but is required for ${provider}.`);
  error.statusCode = 500;
  error.publicMessage = `${provider} API key is not configured on the server.`;
  return error;
}
