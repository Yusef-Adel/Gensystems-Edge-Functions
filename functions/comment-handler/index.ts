import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Parse the incoming JSON request
    const body = await req.json();

    // Validate and extract the `is_insert` parameter
    const { is_insert, question_id, attempt_id, student_id, comment_text } = body;

    if (is_insert === undefined) {
      return new Response(
        JSON.stringify({
          status: "error",
          status_code: 400,
          message: "Missing required field: is_insert (true for insert/update, false for fetch).",
        }),
        { status: 400 }
      );
    }

    if (is_insert) {
      // Insertion/Update logic
      if (!question_id || !attempt_id || !student_id || !comment_text) {
        return new Response(
          JSON.stringify({
            status: "error",
            status_code: 400,
            message: "Missing required fields for insert/update: question_id, attempt_id, student_id, or comment_text.",
          }),
          { status: 400 }
        );
      }

      // Check if a comment already exists
      const { data: existingComment, error: fetchError } = await supabase
        .from("answers_comment")
        .select("*")
        .eq("question_id", question_id)
        .eq("attempt_id", attempt_id)
        .eq("student_id", student_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") { // Ignore "row not found" error
        console.error("Error fetching existing comment:", fetchError);
        return new Response(
          JSON.stringify({
            status: "error",
            status_code: 500,
            message: "Error checking for an existing comment in the database.",
          }),
          { status: 500 }
        );
      }

      if (existingComment) {
        // Update the existing comment
        const { error: updateError } = await supabase
          .from("answers_comment")
          .update({ comment_text })
          .eq("comment_id", existingComment.comment_id);

        if (updateError) {
          console.error("Error updating comment:", updateError);
          return new Response(
            JSON.stringify({
              status: "error",
              status_code: 500,
              message: "Failed to update the existing comment.",
            }),
            { status: 500 }
          );
        }

        return new Response(
          JSON.stringify({
            status: "success",
            status_code: 200,
            message: "Comment updated successfully.",
            data: { comment_id: existingComment.comment_id, comment_text },
          }),
          { status: 200 }
        );
      } else {
        // Insert a new comment
        const { data: insertedComment, error: insertError } = await supabase
          .from("answers_comment")
          .insert([
            {
              question_id,
              attempt_id,
              student_id,
              comment_text,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting comment:", insertError);
          return new Response(
            JSON.stringify({
              status: "error",
              status_code: 500,
              message: "Failed to insert the new comment.",
            }),
            { status: 500 }
          );
        }

        return new Response(
          JSON.stringify({
            status: "success",
            status_code: 200,
            message: "Comment added successfully.",
            data: insertedComment,
          }),
          { status: 200 }
        );
      }
    } else {
      // Fetch data logic
      // Ensure that all required parameters are present and non-empty
      if (!question_id || !attempt_id || !student_id) {
        return new Response(
          JSON.stringify({
            status: "error",
            status_code: 400,
            message: "All parameters (question_id, attempt_id, student_id) are required for fetching data.",
          }),
          { status: 400 }
        );
      }

      // Build the query dynamically based on provided parameters
      const { data: comments, error: fetchError } = await supabase
        .from("answers_comment")
        .select("*")
        .eq("question_id", question_id)
        .eq("attempt_id", attempt_id)
        .eq("student_id", student_id);

      if (fetchError) {
        console.error("Error fetching comments:", fetchError);
        return new Response(
          JSON.stringify({
            status: "error",
            status_code: 500,
            message: "Failed to fetch comments from the database.",
          }),
          { status: 500 }
        );
      }

      if (!comments || comments.length === 0) {
        return new Response(
          JSON.stringify({
            status: "error",
            status_code: 404,
            message: "No comments found for the provided parameters.",
          }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          status: "success",
          status_code: 200,
          message: "Comments fetched successfully.",
          data: comments,
        }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        status_code: 500,
        message: "An unexpected error occurred.",
        details: error.message,
      }),
      { status: 500 }
    );
  }
});
