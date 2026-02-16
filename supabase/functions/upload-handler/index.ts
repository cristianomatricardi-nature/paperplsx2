import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PDF
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are accepted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File exceeds maximum size of 20MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate storage path
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("research-papers")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file to storage" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert paper record
    const { data: paper, error: dbError } = await supabase
      .from("papers")
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.pdf$/i, ""),
        source_type: "pdf_upload",
        storage_path: storagePath,
        file_size: file.size,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (dbError || !paper) {
      console.error("DB insert error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("research-papers").remove([storagePath]);
      return new Response(
        JSON.stringify({ error: "Failed to create paper record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire-and-forget: invoke orchestrate-pipeline
    try {
      fetch(`${supabaseUrl}/functions/v1/orchestrate-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ paper_id: paper.id }),
      });
    } catch (e) {
      console.warn("Failed to invoke orchestrate-pipeline (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({ success: true, paper_id: paper.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
