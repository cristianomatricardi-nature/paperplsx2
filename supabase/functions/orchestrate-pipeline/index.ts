import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let paperId: number;
  try {
    const body = await req.json();
    paperId = body.paper_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON or missing paper_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!paperId) {
    return new Response(
      JSON.stringify({ error: "paper_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify paper exists and is in 'uploaded' status
  const { data: paper, error: fetchError } = await supabase
    .from("papers")
    .select("id, status")
    .eq("id", paperId)
    .single();

  if (fetchError || !paper) {
    return new Response(
      JSON.stringify({ error: `Paper ${paperId} not found` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (paper.status !== "uploaded") {
    return new Response(
      JSON.stringify({ error: `Paper ${paperId} is not in 'uploaded' status (current: ${paper.status})` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Helper to invoke an edge function and wait for result
  async function invokeFunction(fnName: string, payload: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`${fnName} failed (${res.status}): ${errBody}`);
    }
  }

  async function updateStatus(status: string, errorMessage?: string) {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (errorMessage !== undefined) {
      update.error_message = errorMessage;
    }
    await supabase.from("papers").update(update).eq("id", paperId);
  }

  // Background pipeline execution
  const pipelinePromise = (async () => {
    try {
      // Step 1: Parse
      console.log(`[pipeline] Paper ${paperId}: Starting parsing`);
      await updateStatus("parsing");
      await invokeFunction("run-parser", { paper_id: paperId });

      // Step 2: Structure
      console.log(`[pipeline] Paper ${paperId}: Starting structuring`);
      await updateStatus("structuring");
      await invokeFunction("run-structuring", { paper_id: paperId });

      // Step 3: Parallel — chunking + figure extraction
      console.log(`[pipeline] Paper ${paperId}: Starting chunking & figure extraction`);
      await updateStatus("chunking");

      const [chunkingResult, figureResult] = await Promise.allSettled([
        invokeFunction("run-chunking-and-embedding", { paper_id: paperId }),
        invokeFunction("run-figure-extraction", { paper_id: paperId }),
      ]);

      // Chunking is blocking; figure extraction is non-blocking
      if (chunkingResult.status === "rejected") {
        throw new Error(`Chunking failed: ${chunkingResult.reason}`);
      }

      if (figureResult.status === "rejected") {
        console.warn(`[pipeline] Paper ${paperId}: Figure extraction failed (non-blocking): ${figureResult.reason}`);
      }

      // Step 4: Simulated Impact
      console.log(`[pipeline] Paper ${paperId}: Generating simulated impact scores`);
      await invokeFunction("generate-simulated-impact", { paper_id: paperId });

      // Step 5: Finalize
      console.log(`[pipeline] Paper ${paperId}: Pipeline completed`);
      await updateStatus("completed");
    } catch (err) {
      console.error(`[pipeline] Paper ${paperId}: Pipeline failed:`, err);
      await updateStatus("failed", err instanceof Error ? err.message : String(err));
    }
  })();

  // Use EdgeRuntime.waitUntil for background execution if available
  if (typeof (globalThis as any).EdgeRuntime !== "undefined" && (globalThis as any).EdgeRuntime.waitUntil) {
    (globalThis as any).EdgeRuntime.waitUntil(pipelinePromise);
  } else {
    // Fallback: don't await, let it run in background
    pipelinePromise.catch((e) => console.error(`[pipeline] Unhandled error for paper ${paperId}:`, e));
  }

  return new Response(
    JSON.stringify({ success: true, message: `Pipeline started for paper ${paperId}` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
