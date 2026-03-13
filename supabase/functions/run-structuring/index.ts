import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MASTER_STRUCTURING_PROMPT = `You are a scientific paper analysis engine. Your task is to extract and structure the complete content of a research paper into a precise JSON format. You must be thorough and accurate.

INPUT: The full text of a scientific paper, organized by page numbers.

OUTPUT: A JSON object with the following structure. Extract ACTUAL CONTENT, not summaries. Include page numbers for every element.

{
  "metadata": {
    "title": "exact paper title",
    "authors": [{"name": "Full Name", "affiliation": "Institution or null", "orcid": "ORCID or null"}],
    "doi": "DOI or null",
    "journal": "journal name or null",
    "publication_date": "date string or null",
    "keywords": ["keyword1", "keyword2"],
    "field": "primary research field",
    "subfield": "specific subfield"
  },
  "abstract": "full abstract text",
  "sections": [
    {
      "id": "sec_1",
      "heading": "exact section heading",
      "level": 1,
      "content": "FULL text content of this section (not a summary)",
      "page_numbers": [1, 2]
    }
  ],
  "claims": [
    {
      "id": "claim_1",
      "statement": "the specific claim being made",
      "evidence_summary": "what evidence supports this claim",
      "strength": "strong|moderate|preliminary|speculative",
      "supporting_data": "specific data points, statistics, or figures cited",
      "page_numbers": [5],
      "related_figure_ids": ["fig_1"],
      "related_method_ids": ["method_1"]
    }
  ],
  "methods": [
    {
      "id": "method_1",
      "title": "name of the INDIVIDUAL method/protocol step (e.g. 'Substrate Cleaning', 'Lithography', 'Etching')",
      "description": "detailed description of what was done in THIS SPECIFIC step only",
      "method_group": "logical category grouping related steps (e.g. 'Sample Preparation', 'Synthesis', 'Characterization', 'Data Analysis', 'Computational Modeling')",
      "attributed_authors": ["author names responsible for this method, extracted from author contribution statements, acknowledgments, or CRediT roles. If unclear, attribute to all authors."],
      "tools": ["instrument names used in this step"],
      "reagents": ["reagent names with concentrations used in this step"],
      "software": ["software names with versions used in this step"],
      "conditions": ["temperature, duration, environment conditions for this step"],
      "duration": "time taken for this specific step or null",
      "page_numbers": [3],
      "critical_notes": ["important warnings or tips for replication of this step"],
      "depends_on": ["method_ids this step depends on, e.g. method_1"]
    }
  ],
  "figures": [
    {
      "id": "fig_1",
      "caption": "full figure caption",
      "figure_type": "bar_chart|line_graph|scatter|heatmap|microscopy|diagram|photo|other",
      "page_number": 4,
      "description": "detailed description of what the figure shows",
      "key_findings": ["finding 1 from this figure"],
      "data_series": ["description of each data series"]
    }
  ],
  "tables_data": [
    {
      "id": "tab_1",
      "caption": "full table caption",
      "headers": ["Column 1", "Column 2"],
      "summary": "what the table shows",
      "page_number": 5
    }
  ],
  "equations": [
    {
      "id": "eq_1",
      "raw_text": "the equation as text",
      "context": "what this equation represents",
      "page_number": 3
    }
  ],
  "negative_results": [
    {
      "id": "neg_1",
      "description": "what was found to not work or be insignificant",
      "hypothesis_tested": "what was expected",
      "why_it_matters": "why this negative result is informative",
      "page_numbers": [7]
    }
  ],
  "call_to_actions": [
    {
      "id": "cta_1",
      "action": "specific recommended next step or future direction",
      "target_audience": "researchers|policymakers|industry|funders",
      "urgency": "high|medium|low",
      "page_numbers": [8]
    }
  ],
  "scicomm_hooks": [
    {
      "id": "hook_1",
      "hook_type": "analogy|real_world_impact|surprising_finding|human_story",
      "content": "the hook content for science communication",
      "target_audience": "general public|students|media"
    }
  ],
  "references_list": [
    {
      "id": "ref_1",
      "title": "referenced paper title",
      "authors": "author names",
      "year": "publication year",
      "doi": "DOI or null",
      "context": "how this reference is used in the paper"
    }
  ]
}

RULES:
- Extract EVERY figure referenced in the paper, including subfigures (e.g., Fig. 2a, 2b). Scan EVERY page for figure captions starting with 'Fig.', 'Figure', or similar patterns. A typical paper has 3-8 figures. Do NOT skip any visual element.
- Extract ALL claims, not just the main one. A typical paper has 3-10 claims.
- Extract EVERY INDIVIDUAL method step as a SEPARATE entry. Break complex procedures into their distinct sub-steps. For example, if a paper describes "Fabrication" with steps like substrate preparation, lithography, etching, deposition, and characterization, each of these MUST be a separate method entry. A typical experimental paper has 5-15 method steps. Do NOT group multiple steps into a single method entry. Include "depends_on" to show the order/dependencies between steps.
- For negative_results: look in Discussion and Limitations sections. If none are explicitly stated, infer from hedging language or non-significant results.
- For call_to_actions: extract from Conclusion and Future Work sections.
- For scicomm_hooks: generate these yourself based on the paper content — create analogies, identify real-world impacts, and find surprising findings that would engage a general audience.
- Page numbers MUST be accurate. Cross-reference with the page_map provided.
- Return ONLY valid JSON. No markdown, no comments.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
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

  try {
    // 1. Fetch the parsed text and page_map from temp storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("research-papers")
      .download(`temp/${paperId}/parsed.json`);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download parsed.json: ${downloadError?.message}`);
    }

    const parsedText = await fileData.text();
    const parsedData = JSON.parse(parsedText);
    const { raw_text, page_map, num_pages } = parsedData;

    // 2. Construct the user prompt with page-mapped content
    let userPrompt = `Here is a scientific paper with ${num_pages} pages. The text is organized by page number:\n\n`;
    for (const [pageNum, pageText] of Object.entries(page_map)) {
      userPrompt += `--- PAGE ${pageNum} ---\n${pageText}\n\n`;
    }
    userPrompt += `\nPlease extract and structure the complete content of this paper according to the JSON schema provided in your instructions.`;

    // 3. Call the OpenAI API
    console.log(`[run-structuring] Paper ${paperId}: Calling OpenAI API with ${raw_text.length} chars of text`);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 16000,
        messages: [
          { role: "system", content: MASTER_STRUCTURING_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      throw new Error(`OpenAI API error (${openaiResponse.status}): ${errText}`);
    }

    const openaiResult = await openaiResponse.json();
    const assistantMessage = openaiResult.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("No content in OpenAI response");
    }

    // 4. Parse the JSON response
    let structuredPaper: any;
    try {
      structuredPaper = JSON.parse(assistantMessage);
    } catch (parseErr) {
      throw new Error(`Failed to parse OpenAI JSON response: ${parseErr}`);
    }

    // 5. Validate the response has required top-level keys
    const requiredKeys = [
      "metadata", "abstract", "sections", "claims", "methods",
      "figures", "tables_data", "equations", "negative_results",
      "call_to_actions", "scicomm_hooks", "references_list",
    ];
    for (const key of requiredKeys) {
      if (!(key in structuredPaper)) {
        console.warn(`[run-structuring] Paper ${paperId}: Missing key "${key}" in response, defaulting to empty`);
        if (key === "metadata") structuredPaper[key] = {};
        else if (key === "abstract") structuredPaper[key] = "";
        else structuredPaper[key] = [];
      }
    }

    // 6. Upsert into the structured_papers table
    const { error: upsertError } = await supabase
      .from("structured_papers")
      .upsert(
        {
          paper_id: paperId,
          metadata: structuredPaper.metadata,
          abstract: structuredPaper.abstract,
          sections: structuredPaper.sections,
          claims: structuredPaper.claims,
          methods: structuredPaper.methods,
          figures: structuredPaper.figures,
          tables_data: structuredPaper.tables_data,
          equations: structuredPaper.equations,
          negative_results: structuredPaper.negative_results,
          call_to_actions: structuredPaper.call_to_actions,
          scicomm_hooks: structuredPaper.scicomm_hooks,
          references_list: structuredPaper.references_list,
          schema_version: "2.0",
        },
        { onConflict: "paper_id" }
      );

    if (upsertError) {
      throw new Error(`Failed to upsert structured_papers: ${upsertError.message}`);
    }

    // 7. Update papers.title, papers.authors, papers.abstract, papers.doi from extracted metadata
    const metadata = structuredPaper.metadata || {};
    const paperUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (metadata.title) paperUpdate.title = metadata.title;
    if (metadata.authors) paperUpdate.authors = metadata.authors;
    if (structuredPaper.abstract) paperUpdate.abstract = structuredPaper.abstract;
    if (metadata.doi) paperUpdate.doi = metadata.doi;
    if (metadata.journal) paperUpdate.journal = metadata.journal;
    if (metadata.publication_date) paperUpdate.publication_date = metadata.publication_date;

    const { error: updateError } = await supabase
      .from("papers")
      .update(paperUpdate)
      .eq("id", paperId);

    if (updateError) {
      throw new Error(`Failed to update paper metadata: ${updateError.message}`);
    }

    console.log(`[run-structuring] Paper ${paperId}: Structured successfully — ${structuredPaper.sections?.length || 0} sections, ${structuredPaper.claims?.length || 0} claims, ${structuredPaper.methods?.length || 0} methods`);

    return new Response(
      JSON.stringify({
        success: true,
        sections_count: structuredPaper.sections?.length || 0,
        claims_count: structuredPaper.claims?.length || 0,
        methods_count: structuredPaper.methods?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[run-structuring] Paper ${paperId}: Failed:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
