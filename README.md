
# Translation Webhook

Express service that powers the Google Docs add-on.  
Accepts translation jobs and relays them to either xAI or Claude before replying with the translated text.

## HTTP Contract

- **Endpoint:** `POST /`
- **Request JSON:** `{ "provider": "claude" | "xai", "prompt": "text to translate", "metadata": { ... } }`
- **Successful response:** `{ "translation": "translated text", "prompt": "prompt text (trimmed)" }`
- **Error response:** `{ "error": "message" }` with an appropriate status code.

`metadata` is optional and forwarded to the model as additional context.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Port to listen on (defaults to 3000). |
| `XAI_API_KEY` | When using provider `xai` | API key from xAI (Grok). |
| `XAI_MODEL` | No | Grok model name, defaults to `grok-beta`. |
| `ANTHROPIC_API_KEY` | When using provider `claude` | API key for Anthropic Claude. |
| `ANTHROPIC_MODEL` | No | Claude model, defaults to `claude-3-haiku-20240307`. |
| `ANTHROPIC_MAX_TOKENS` | No | Overrides the max tokens sent to Claude (default `1024`). |

Create a `.env` file locally if you prefer:

```
XAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Local Development

```bash
npm install
npm start
```

Send a test request:

```bash
curl -s http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to Tradition Chinese: Hello, world!","metadata":{"docId":"abc"}}'

curl -s https://hello-webhook.onrender.com \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to Traditional Chinese: mother!","metadata":{"docId":"abc"}}'

curl -s https://hello-webhook.onrender.com \
  -H "Content-Type: application/json" \
  -d '{"provider":"claude","prompt":"Translate to simplied Chinese: mother!","metadata":{"docId":"abc"}}'
```

## Deploy to Render

1. Push changes to GitHub.
2. In Render: **New ➜ Web Service**.
3. Select the repo and use the defaults:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the required environment variables (API keys, model overrides).
5. Deploy. Render will provide the public HTTPS URL for the add-on.

## Google Docs Add-on Integration

Update the Apps Script to call the new contract, for example:

```javascript
function translateViaWebhook(promptText) {
  const url = 'https://<your-render-service>.onrender.com';
  const payload = {
    provider: 'claude',
    prompt: promptText,
    metadata: { docId: DocumentApp.getActiveDocument().getId() }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const body = JSON.parse(response.getContentText());
  if (!body.translation) {
    throw new Error(body.error || 'Translation failed');
  }
  return {
    translation: body.translation,
    prompt: body.prompt
  };
}
```

You can wrap this helper with your add-on menu handlers to surface translations inside the document.

## Update Workflow

1. Make your code changes locally and update `.env` if new secrets are required (never commit `.env`).
2. Run `npm install` when dependencies change, then commit the resulting `package-lock.json`.
3. Commit your changes and push to the main branch (`git add -A && git commit -m "Describe change" && git push`).
4. Render builds and deploys automatically from Git; confirm the latest deploy finished in the dashboard.
5. If you changed API keys, update them in Render → Environment tab → save; Render restarts the service using the new keys.
