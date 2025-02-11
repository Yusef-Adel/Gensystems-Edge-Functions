import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper function to return JSON responses with standard headers.
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Supabase environment variables.
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // Parse request body
    const body = await req.json();
    const { answers } = body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return jsonResponse(
        {
          status: "error",
          message: "The 'answers' field must be a non-empty array.",
        },
        400
      );
    }

    // Validate each answer object
    const requiredFields = ["user_id", "option_id", "question_id", "attempt_id"];
    const invalidAnswers = answers.filter((answer) =>
      requiredFields.some((field) => !answer[field])
    );

    if (invalidAnswers.length > 0) {
      return jsonResponse(
        {
          status: "error",
          message: "Some answers are missing required fields.",
          details: invalidAnswers,
        },
        400
      );
    }

    // Get attempt_id, user_id, and quiz_id from the first answer (all should be the same)
    const { user_id, attempt_id, quiz_id } = answers[0];

    // Process each answer
    const processedAnswers = await Promise.all(
      answers.map(async (answer) => {
        const { option_id, question_id, answer_text, score, comment } = answer;

        // Validate the option_id against the options table.
        const { data: option, error: optionError } = await supabase
          .from("options")
          .select("is_correct")
          .eq("option_id", option_id)
          .eq("question_id", question_id)
          .single();

        if (optionError || !option) {
          return {
            status: "error",
            message: `Invalid option_id or question_id for answer with question_id ${question_id}.`,
          };
        }

        const is_correct = option.is_correct;

        // Check if an answer already exists
        const { data: existingAnswer, error: checkError } = await supabase
          .from("answers")
          .select("answer_id")
          .eq("user_id", user_id)
          .eq("question_id", question_id)
          .eq("attempt_id", attempt_id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          return {
            status: "error",
            message: `Error checking existing answer for question_id ${question_id}.`,
          };
        }

        if (existingAnswer) {
          // Update the existing answer
          const { data: updatedAnswer, error: updateError } = await supabase
            .from("answers")
            .update({
              option_id,
              answer_text,
              score,
              is_correct,
              comment,
            })
            .eq("answer_id", existingAnswer.answer_id)
            .select("*")
            .single();

          if (updateError) {
            return {
              status: "error",
              message: `Error updating answer for question_id ${question_id}.`,
            };
          }

          return {
            status: "success",
            message: `Answer for question_id ${question_id} updated successfully.`,
            data: updatedAnswer,
          };
        } else {
          // Insert a new answer
          const { data: newAnswer, error: insertError } = await supabase
            .from("answers")
            .insert([
              {
                user_id,
                option_id,
                question_id,
                attempt_id,
                answer_text,
                score,
                is_correct,
                comment,
              },
            ])
            .select("*")
            .single();

          if (insertError) {
            console.error(`Insert error for question_id ${question_id}:`, insertError);
            return {
              status: "error",
              message: `Error inserting new answer for question_id ${question_id}.`,
              details: insertError.message,
            };
          }

          return {
            status: "success",
            message: `Answer for question_id ${question_id} created successfully.`,
            data: newAnswer,
          };
        }
      })
    );

    // 🔹 Step 2: Fetch total number of questions in the quiz
    const { data: quizQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("question_id")
      .eq("quiz_id", quiz_id);

    if (questionsError || !quizQuestions) {
      console.error("Error fetching quiz questions:", questionsError);
      return jsonResponse(
        {
          status: "error",
          message: "Failed to fetch quiz questions",
          details: questionsError?.message || "No questions found.",
        },
        500
      );
    }

    const totalQuestions = quizQuestions.length;

    // 🔹 Step 3: Fetch all answers for this attempt
    const { data: answersData, error: answersError } = await supabase
      .from("answers")
      .select("question_id, is_correct")
      .eq("attempt_id", attempt_id)
      .eq("user_id", user_id);

    if (answersError) {
      console.error("Error fetching answers:", answersError);
      return jsonResponse(
        {
          status: "error",
          message: "Failed to fetch answers",
          details: answersError.message,
        },
        500
      );
    }

    // 🔹 Step 4: Count correct and incorrect answers
    const correctAnswersCount = answersData.filter(
      (answer) => answer.is_correct === true
    ).length;

    const wrongAnswersCount = answersData.filter(
      (answer) => answer.is_correct === false
    ).length;

    // 🔹 Step 5: Calculate unanswered questions
    const answeredQuestionsSet = new Set(answersData.map((a) => a.question_id));
    const unansweredQuestionsCount = totalQuestions - answeredQuestionsSet.size;

    // 🔹 Step 6: Insert calculated results into the `attempts` table
    const { error: updateError } = await supabase
      .from("attempts")
      .update({
        right_answers: correctAnswersCount,
        false_answers: wrongAnswersCount,
      })
      .eq("attempt_id", attempt_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating attempts table:", updateError);
      return jsonResponse(
        {
          status: "error",
          message: "Failed to update attempts table",
          details: updateError.message,
        },
        500
      );
    }

    return jsonResponse({
      status: "success",
      results: processedAnswers,
      data: {
        total_questions: totalQuestions,
        correct_answers: correctAnswersCount,
        wrong_answers: wrongAnswersCount,
        unanswered_questions: unansweredQuestionsCount,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(
      {
        status: "error",
        message: "An unexpected error occurred.",
        details: error.message,
      },
      500
    );
  }
});
