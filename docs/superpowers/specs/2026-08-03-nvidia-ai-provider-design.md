# NVIDIA AI Provider for `/api/analyze-service`

## Goal

Replace the Google AI Studio (Gemini) backend behind `/api/analyze-service` with the NVIDIA NIM API, using a single `NVIDIA_API_KEY`. The frontend (`analyzeWithAI` in `src/api/insforgeService.ts`) remains unchanged — it sends the same payload and receives the same `AIAnalysis` JSON shape.

## Provider & Model

- **API:** NVIDIA NIM (OpenAI-compatible) at `NVIDIA_BASE_URL` (default `https://integrate.api.nvidia.com/v1`), endpoint `chat/completions`.
- **Auth:** `Authorization: Bearer $NVIDIA_API_KEY`.
- **Model (default):** `meta/llama-3.2-11b-vision-instruct` — vision-capable, fast, lower cost.
- **Alternative (swappable via env):** `meta/llama-3.2-90b-vision-instruct` for higher-quality vision at higher cost. Any NIM chat-completions model with vision works; expose model name via `NVIDIA_MODEL` env.
- **Transport:** raw `fetch` — no new npm dependency (server already uses `fetch` for InsForge calls).

## Architecture

Single-endpoint swap. Only `server/index.ts` (the `analyze-service` handler) changes. `src/` is untouched. `getFallbackAnalysis` is reused as the failure path.

### Removed

- `import { GoogleGenAI, Type } from '@google/genai'`
- Gemini `responseSchema` and `Type.*` enum usage.
- Gemini-specific `httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }`.

### Added

- `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL` env reads with defaults.
- `callNvidiaAnalyze(...)` helper that POSTs to `chat/completions` and returns parsed JSON.
- `parseAndValidateAnalysis(content)` that extracts JSON from the model response (handles ```json fences), parses it, and verifies required `AIAnalysis` fields.
- On any failure (missing key / fetch error / non-JSON / missing fields) → `getFallbackAnalysis`.

## Request shape (NVIDIA NIM chat/completions)

```
POST {NVIDIA_BASE_URL}/chat/completions
Authorization: Bearer ${NVIDIA_API_KEY}
Content-Type: application/json

{
  "model": "<NVIDIA_MODEL>",
  "messages": [
    { "role": "system", "content": "<PT-BR system prompt: return ONLY valid JSON matching AIAnalysis>" },
    { "role": "user",   "content": [
        { "type": "text", "text": "<per-service prompt>" },
        ...(imageBase64 ? [{ "type": "image_url",
                              "image_url": { "url": "data:<mime>;base64,<...>" } }] : [])
    ]}
  ],
  "temperature": 0.4,
  "top_p": 1,
  "max_tokens": 1024,
  "stream": false
}
```

## Output contract

Response: `AIAnalysis` (unchanged) — fields required and validated:
`summary, description, category, complexity, estimatedTime, materialsNeeded, suggestedMinPrice, suggestedMaxPrice, technicalNotes, recommendedAction`.

Strategy: instruct the model in the system prompt to return strict JSON; parse defensively; validate required fields; fall back to `getFallbackAnalysis` on any failure. This is robust across NVIDIA models regardless of `response_format: json_schema` support.

## Error handling

| Condition | Behavior |
|-----------|----------|
| `NVIDIA_API_KEY` missing | `getFallbackAnalysis` |
| `fetch` throws / non-2xx | log + `getFallbackAnalysis` |
| Response content is not valid JSON | log + `getFallbackAnalysis` |
| JSON missing required fields | log + `getFallbackAnalysis` |

All failure paths keep the existing user-visible contract (200 OK with the `AIAnalysis` JSON), so the frontend requires no changes.

## Configuration

`.env.example` (committed, placeholder values):

```
NVIDIA_API_KEY=nvapi-your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
```

`GEMINI_API_KEY` line removed from `.env.example`.

Real key lives in `.env` (gitignored).

## Dependency note

`@google/genai` remains in `package.json` after this change (becomes unused). It will be removed in a follow-up to avoid colliding with an unrelated uncommitted `tsx` addition in `package.json`. Lint-clean today because the import is removed from `server/index.ts`.

## Testing / verification

- `npm run lint` — clean (no new `no-unused-vars`; the Gemini import is removed).
- `npm run build` — succeeds.
- Server boot: `PORT=3999 timeout 6 npx tsx server/index.ts` → "Servidor de analise rodando na porta 3999".
- Smoke: `curl -X POST http://localhost:3001/api/analyze-service -H 'Content-Type: application/json' -d '{"category":"Eletricista","notes":"tomada com faisca"}'` → 200 JSON with `summary` field present (or fallback shape when key absent).

## Scope

Single endpoint, ~3 files: `server/index.ts`, `.env.example`, and the spec doc. No frontend changes. No schema migrations. No new dependencies.
