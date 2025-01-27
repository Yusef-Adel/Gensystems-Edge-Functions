import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const body = await req.json();

    // Validate input parameters
    const { user_id, option_id, question_id, attempt_id, answer_text, score, comment } = body;

    // Collect missing fields
    const missingFields = [];
    if (!user_id) missingFields.push("user_id");
    if (!option_id) missingFields.push("option_id");
    if (!question_id) missingFields.push("question_id");
    if (!attempt_id) missingFields.push("attempt_id");

    // Return error if any required field is missing
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: `Missing required parameters: ${missingFields.join(", ")}`,
        }),
        { status: 400 }
      );
    }

    // Validate the option_id against the options table
    const { data: option, error: optionError } = await supabase
      .from("options")
      .select("is_correct")
      .eq("option_id", option_id)
      .eq("question_id", question_id);

    if (optionError) {
      console.error("Error querying options table:", optionError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Error querying options table",
        }),
        { status: 500 }
      );
    }

    if (!option || option.length === 0) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Invalid option_id or question_id: No matching option found",
        }),
        { status: 400 }
      );
    }

    const is_correct = option[0].is_correct; // Retrieve correctness

    // Check if an answer already exists based on user_id, question_id, and attempt_id
    const { data: existingAnswer, error: checkError } = await supabase
      .from("answers")
      .select("*")
      .eq("user_id", user_id)
      .eq("question_id", question_id)
      .eq("attempt_id", attempt_id);

    console.log("Existing Answer Check:", { existingAnswer, checkError });

    if (checkError) {
      console.error("Error checking existing answer:", checkError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Error checking existing answer",
        }),
        { status: 500 }
      );
    }

    if (existingAnswer && existingAnswer.length > 0) {
      // Update the existing answer
      const { error: updateError, data: updatedAnswer } = await supabase
        .from("answers")
        .update({
          option_id,
          answer_text,
          score,
          is_correct,
          comment // Use validated correctness
        })
        .eq("answer_id", existingAnswer[0].answer_id)
        .select("*"); // Return the updated row for verification

      console.log("Updated Answer:", { updatedAnswer, updateError });

      if (updateError) {
        console.error("Error updating answer:", updateError);
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Error updating answer",
          }),
          { status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          status: "success",
          message: "Answer updated successfully",
          updatedAnswer,
        }),
        { status: 200 }
      );
    } else {
      // Insert a new answer
      const { data: newAnswer, error: insertError } = await supabase.from("answers").insert([
        {
          user_id,
          option_id,
          question_id,
          attempt_id,
          answer_text,
          score,
          is_correct, // Use validated correctness
          comment,
        },
      ]).select("*"); // Return the inserted row for verification

      console.log("Inserted Answer:", { newAnswer, insertError });

      if (insertError) {
        console.error("Error inserting answer:", insertError);
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Error inserting new answer",
          }),
          { status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          status: "success",
          message: "Answer created successfully",
          newAnswer,
        }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "An unexpected error occurred",
        details: error.message,
      }),
      { status: 500 }
    );
  }
});
