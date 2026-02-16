

## Switch `generate-simulated-impact` to OpenAI GPT-4o-mini

Since you already have an `OPENAI_API_KEY` secret configured, the function should use OpenAI directly as originally specified in Prompt 12.

### What Changes

**File: `supabase/functions/generate-simulated-impact/index.ts`**

1. Replace the Lovable AI Gateway call with a direct OpenAI Chat Completions call:
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Model: `gpt-4o-mini`
   - Auth: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
2. Remove the `LOVABLE_API_KEY` reference
3. Keep everything else identical (prompt, parsing, error handling, DB save)

### Technical Detail

```text
OLD:
  URL:    https://ai.gateway.lovable.dev/v1/chat/completions
  Key:    LOVABLE_API_KEY
  Model:  google/gemini-3-flash-preview

NEW:
  URL:    https://api.openai.com/v1/chat/completions
  Key:    OPENAI_API_KEY
  Model:  gpt-4o-mini
```

The request/response format stays the same since both use the OpenAI Chat Completions schema. Only the URL, key, and model name change.

### Standing Rule for Future Functions

Going forward, all AI-powered edge functions will use OpenAI models via the `OPENAI_API_KEY` secret (already configured) rather than the Lovable AI Gateway, unless you say otherwise.

