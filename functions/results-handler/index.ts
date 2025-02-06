import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const { user_id, quiz_id, attempt_id } = await req.json();

    // Input validation
    if (!user_id || !quiz_id || !attempt_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required parameters: user_id, quiz_id, attempt_id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the total number of questions in the quiz
    const { data: totalQuestionsCount, error: questionsError } = await supabase
      .from("questions")
      .select("question_id", { count: "exact" })
      .eq("quiz_id", quiz_id);

    if (questionsError) {
      console.error("Error fetching total questions:", questionsError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch total questions",
          details: questionsError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const totalQuestions = totalQuestionsCount?.length || 0;

    // Fetch the count of correct and incorrect answers for the attempt
    const { data: answersData, error: answersError } = await supabase
      .from("answers")
      .select("is_correct", { count: "exact" })
      .eq("attempt_id", attempt_id)
      .eq("user_id", user_id);

    if (answersError) {
      console.error("Error fetching answers:", answersError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch answers",
          details: answersError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Count correct and wrong answers
    const correctAnswersCount = answersData.filter(
      (answer) => answer.is_correct === true
    ).length;
    const wrongAnswersCount = answersData.filter(
      (answer) => answer.is_correct === false
    ).length;

    // Calculate unanswered questions
    const answeredQuestionsCount = correctAnswersCount + wrongAnswersCount;
    const unansweredQuestionsCount = Math.max(
      totalQuestions - answeredQuestionsCount,
      0
    );

    // Construct the response
    const response = {
      status: "success",
      data: {
        correct_answers: correctAnswersCount,
        wrong_answers: wrongAnswersCount,
        unanswered_questions: unansweredQuestionsCount,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Adjust as needed
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "An unexpected error occurred",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
