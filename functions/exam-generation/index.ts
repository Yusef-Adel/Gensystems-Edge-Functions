import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const API_KEY = "5AseR1uQ2bucRgCGfK9HKLLvC5wrRmw21PtDFQs_l68";
const API_URL = "https://api.genexam.ai/api/v1/query/generate-exam";
const FINAL_API_BASE_URL = "https://genexam.ai";

serve(async (req) => {
  try {
    const body = await req.json();

    // Validate input parameters
    if (!validateParameters(body)) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: {
            parameter: "missing_or_invalid",
            message: "Invalid or missing parameters",
          },
        }),
        { status: 400 }
      );
    }

    // Insert quiz into the "quizzes" table
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .insert([
        {
          created_by: body.created_by,
          subject_id: body.subject_id,
          chapter: body.chapter,
          is_active: body.is_active,
          class: body.class,
          number_of_questions:
            body.number_of_mcq_questions + body.number_of_true_false_questions,
          duration: body.duration,
          questions_types: body.questions_types,
          difficulty: body.difficulty,
          class_id: body.class_id,
          code: body.code,
          term_id: body.term_id,
        },
      ])
      .select("quiz_id");

    if (quizError) {
      console.error("Database Error (Quizzes):", quizError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to insert quiz into database",
        }),
        { status: 500 }
      );
    }

    const quizId = quizData[0].quiz_id;

    // Fetch exam data from the external API
    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exam_difficulty_level: body.exam_difficulty_level,
        educational_system: body.educational_system,
        academic_year: body.academic_year,
        semester: body.semester,
        subject: body.subject,
        chapter: body.chapter,
        number_of_mcq_questions: body.number_of_mcq_questions,
        number_of_true_false_questions: body.number_of_true_false_questions,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("API Error:", errorText);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch data from API",
          details: errorText,
        }),
        { status: 500 }
      );
    }

    const responseData = await apiResponse.json();

    // Calculate the total number of questions from the response
    const numberOfQuestions =
      responseData.exam.mcq_questions.length +
      responseData.exam.true_false_questions.length;

    // Insert MCQ and True/False questions into "questions" table
    const allQuestions = responseData.exam.mcq_questions
      .map((q: any) => ({
        quiz_id: quizId,
        question_text: q.question,
        question_type: "mcq",
      }))
      .concat(
        responseData.exam.true_false_questions.map((q: any) => ({
          quiz_id: quizId,
          question_text: q.question,
          question_type: "true_false",
        }))
      );

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(allQuestions)
      .select("question_id, question_type, question_text");

    if (questionsError) {
      console.error("Database Error (Questions):", questionsError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to insert questions into database",
        }),
        { status: 500 }
      );
    }

    // Insert options into "options" table
    const optionsData = [];
    let mcqIndex = 0;

    insertedQuestions.forEach((question: any) => {
      if (question.question_type === "mcq") {
        const mcq = responseData.exam.mcq_questions[mcqIndex];
        const correctAnswer = mcq?.correct_answer;

        if (!correctAnswer) {
          console.error(
            `Missing correct_answer for MCQ question: ${mcq?.question}`
          );
          mcqIndex++;
          return;
        }

        mcq.options.forEach((option: string) => {
          optionsData.push({
            question_id: question.question_id,
            option_text: option,
            is_correct: option === correctAnswer,
          });
        });
        mcqIndex++;
      } else if (question.question_type === "true_false") {
        const trueFalseQuestion = responseData.exam.true_false_questions.find(
          (q: any) => q.question === question.question_text
        );

        if (!trueFalseQuestion || !trueFalseQuestion.correct_answer) {
          console.error(
            `Missing correct_answer for True/False question: ${trueFalseQuestion?.question}`
          );
          return;
        }

        optionsData.push(
          {
            question_id: question.question_id,
            option_text: "True",
            is_correct: trueFalseQuestion.correct_answer === "True",
          },
          {
            question_id: question.question_id,
            option_text: "False",
            is_correct: trueFalseQuestion.correct_answer === "False",
          }
        );
      }
    });

    if (optionsData.length > 0) {
      const { error: optionsError } = await supabase
        .from("options")
        .insert(optionsData);
      if (optionsError) {
        console.error("Database Error (Options):", optionsError);
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Failed to insert options into database",
          }),
          { status: 500 }
        );
      }
    }

    // Update attempt status using the final API call, including the `quiz_id` and `number_of_questions`
    const updateKey = "TgR7pJwq9kD2nXzYbL1uVf3";
    const attempt = body.attempt;
    const versionTest = body.version_test;
    const bubbleQuizId = body.bubble_quiz_id;

    if (!bubbleQuizId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing parameter: bubble_quiz_id",
        }),
        { status: 400 }
      );
    }

    const finalApiUrl = `${FINAL_API_BASE_URL}/${versionTest}/api/1.1/wf/update_attempt_status?key=${updateKey}&bubble_quiz_id=${encodeURIComponent(
      bubbleQuizId
    )}&attempt=${encodeURIComponent(attempt)}&quiz_id=${encodeURIComponent(
      quizId
    )}&number_of_questions=${encodeURIComponent(numberOfQuestions)}`;

    const finalApiResponse = await fetch(finalApiUrl, {
      method: "GET",
    });

    const finalApiData = await finalApiResponse.json();
    console.log("Final API Response:", finalApiData);

    if (!finalApiResponse.ok) {
      console.error("Final API Error:", finalApiData);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to update exam status",
          details: finalApiData,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message:
          "Quiz, questions, options inserted, and exam status updated successfully",
        finalApiResponse: finalApiData,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected Error:", error);
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

// Helper function to validate input parameters
function validateParameters(parameters: any): boolean {
  const requiredFields = [
    "exam_difficulty_level",
    "educational_system",
    "academic_year",
    "semester",
    "subject",
    "chapter",
    "number_of_mcq_questions",
    "number_of_true_false_questions",
    "created_by",
    "subject_id",
    "is_active",
    "class",
    "duration",
    "questions_types",
    "difficulty",
    "class_id",
    "code",
    "term_id",
    "attempt",
    "version_test",
    "bubble_quiz_id",
  ];
  return requiredFields.every((field) => parameters[field] !== undefined);
}
