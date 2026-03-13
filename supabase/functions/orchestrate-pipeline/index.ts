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

  // Fire-and-forget: dispatch an edge function without waiting for response body
  function fireFunction(fnName: string, payload: Record<string, unknown>): void {
    fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn(`[pipeline] Fire ${fnName} dispatch error (non-fatal):`, err);
    });
  }

  // Poll a condition function until it returns true, or timeout
  async function pollForCondition(
    description: string,
    checkFn: () => Promise<boolean>,
    timeoutMs: number,
    intervalMs = 5000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // Check if paper failed (another function errored)
      const { data: p } = await supabase
        .from("papers")
        .select("status")
        .eq("id", paperId)
        .single();
      if (p?.status === "failed") {
        throw new Error(`Paper marked as failed during: ${description}`);
      }

      const done = await checkFn();
      if (done) {
        console.log(`[pipeline] Paper ${paperId}: ${description} — condition met`);
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timeout waiting for: ${description} (${timeoutMs / 1000}s)`);
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
      fireFunction("run-parser", { paper_id: paperId });

      // Poll: run-parser updates papers.num_pages when done
      await pollForCondition(
        "parsing complete (num_pages set)",
        async () => {
          const { data } = await supabase
            .from("papers")
            .select("num_pages")
            .eq("id", paperId)
            .single();
          return data?.num_pages != null;
        },
        300_000, // 5 min
      );

      // Step 2: Structure
      console.log(`[pipeline] Paper ${paperId}: Starting structuring`);
      await updateStatus("structuring");
      fireFunction("run-structuring", { paper_id: paperId });

      // Poll: run-structuring upserts structured_papers with sections
      await pollForCondition(
        "structuring complete (structured_papers.sections populated)",
        async () => {
          const { data } = await supabase
            .from("structured_papers")
            .select("sections")
            .eq("paper_id", paperId)
            .maybeSingle();
          if (!data) return false;
          const sections = data.sections as unknown[];
          return Array.isArray(sections) && sections.length > 0;
        },
        300_000, // 5 min
      );

      // Step 3: Parallel — chunking + figure extraction
      console.log(`[pipeline] Paper ${paperId}: Starting chunking & figure extraction`);
      await updateStatus("chunking");
      fireFunction("run-chunking-and-embedding", { paper_id: paperId });

      // Construct page_images from num_pages (PNGs uploaded by the client in parallel)
      const { data: paperForPages } = await supabase
        .from("papers")
        .select("num_pages")
        .eq("id", paperId)
        .single();
      const numPages = paperForPages?.num_pages ?? 0;
      if (numPages > 0) {
        const pageImages = Array.from({ length: numPages }, (_, i) => ({
          page_number: i + 1,
          storage_path: `${paperId}/page_${i + 1}.png`,
        }));
        fireFunction("run-figure-extraction", { paper_id: paperId, page_images: pageImages });
      } else {
        console.warn(`[pipeline] Paper ${paperId}: num_pages not available, skipping figure extraction`);
      }

      // Poll: figure extraction updates structured_papers.figures with bounding_box data
      // (non-blocking — we only block on chunking)

      // Poll: chunking inserts rows into chunks table (blocking)
      await pollForCondition(
        "chunking complete (chunks exist)",
        async () => {
          const { count } = await supabase
            .from("chunks")
            .select("id", { count: "exact", head: true })
            .eq("paper_id", paperId);
          return (count ?? 0) > 0;
        },
        300_000, // 5 min
      );

      // Step 4: Module Titles + Simulated Impact (parallel)
      console.log(`[pipeline] Paper ${paperId}: Generating module titles + simulated impact scores`);
      fireFunction("generate-module-titles", { paper_id: paperId });
      fireFunction("generate-simulated-impact", { paper_id: paperId });

      // Poll: generate-simulated-impact sets papers.simulated_impact_scores
      await pollForCondition(
        "simulated impact scores generated",
        async () => {
          const { data } = await supabase
            .from("papers")
            .select("simulated_impact_scores")
            .eq("id", paperId)
            .single();
          return data?.simulated_impact_scores != null;
        },
        120_000, // 2 min
      );

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
    pipelinePromise.catch((e) => console.error(`[pipeline] Unhandled error for paper ${paperId}:`, e));
  }

  return new Response(
    JSON.stringify({ success: true, message: `Pipeline started for paper ${paperId}` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
