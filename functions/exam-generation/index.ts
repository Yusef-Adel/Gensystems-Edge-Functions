import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("Incoming request body:", JSON.stringify(body));

    // Determine the mode; default to live if not provided.
    const mode = String(body.mode || "live").toLowerCase();

    // **************************************
    // TEST MODE (No DB insertions)
    // **************************************
    if (mode === "test") {
      // List of fields required in test mode.
      const requiredTestFields = [
        "exam_difficulty_level",
        "educational_system",
        "academic_year",
        "semester",
        "subject",
        "chapter",
        "lessons",
        "number_of_mcq_questions",
        "number_of_true_false_questions",
        "attempt_id",         // New required parameter
        "bubble_quiz_id"      // New required parameter
      ];
      for (const field of requiredTestFields) {
        if (
          body[field] === undefined ||
          body[field] === null ||
          (Array.isArray(body[field]) && body[field].length === 0) ||
          (typeof body[field] === "string" && body[field].trim() === "")
        ) {
          return new Response(
            JSON.stringify({
              status: "error",
              message: `Test mode: Field '${field}' cannot be empty`,
              httpStatus: 400,
            }),
            { status: 400 }
          );
        }
      }

      // Determine language (default to "ar").
      const language = String(body.lang || "ar").toLowerCase();

      // Select the proper test API key and header.
      const selectedApiKey = language === "ar" ? AR_TEST_API_KEY : EN_TEST_API_KEY;
      const selectedApiHeader = language === "ar" ? "AR-API-Key" : "EN-API-Key";

      // Construct the test API URL.
      const apiUrl = `https://test.genexam.ai/api/${language}/query/generate-exam`;

      // Build the API request body for test mode.
      const apiBody = {
        exam_difficulty_level: String(body.exam_difficulty_level),
        educational_system: String(body.educational_system),
        academic_year: String(body.academic_year),
        semester: String(body.semester),
        subject: String(body.subject),
        chapter: Array.isArray(body.chapter)
          ? body.chapter.map(ch => String(ch).trim()).filter(ch => ch.length > 0)
          : [],
        lessons: Array.isArray(body.lessons)
          ? body.lessons.map(lesson => String(lesson).trim()).filter(lesson => lesson.length > 0)
          : [],
        number_of_mcq_questions: Number(body.number_of_mcq_questions),
        number_of_true_false_questions: Number(body.number_of_true_false_questions)
      };

      console.log("Test API Request Body:", JSON.stringify(apiBody));
      console.log("Test API Endpoint:", apiUrl);
      console.log("Test API Header:", selectedApiHeader, "is set");

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          [selectedApiHeader]: selectedApiKey,
          "Content-Type": "application/json; charset=utf-8",
          "Accept": "application/json"
        },
        body: JSON.stringify(apiBody),
      });

      console.log("Test API Response Status:", apiResponse.status, apiResponse.statusText);

      if (!apiResponse.ok) {
        let errorDetails;
        try {
          errorDetails = await apiResponse.json();
        } catch (e) {
          errorDetails = await apiResponse.text();
        }
        console.error("Test API Error Details:", errorDetails);
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Failed to fetch data from Test API",
            details: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails,
            requestBody: apiBody,
            apiUrl: apiUrl,
            headers: { [selectedApiHeader]: "****" },
            httpStatus: apiResponse.status,
          }),
          { status: 500 }
        );
      }

      const responseData = await apiResponse.json();
      console.log("Test API Response Data:", JSON.stringify(responseData).substring(0, 200) + "...");
      
      // Store the attempt_id and bubble_quiz_id in the response
      responseData.metadata = {
        attempt_id: String(body.attempt_id),
        bubble_quiz_id: String(body.bubble_quiz_id)
      };
      
      // Return the API response as the result of test mode.
      return new Response(
        JSON.stringify({
          status: "success",
          message: "Test exam generated successfully",
          data: responseData,
          httpStatus: 200,
        }),
        { status: 200 }
      );
    }

    // **************************************
    // LIVE MODE
    // **************************************
    // Validate the input parameters for live mode.
    if (!validateParameters(body)) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Invalid or missing parameters",
          httpStatus: 400,
        }),
        { status: 400 }
      );
    }

    // Use language parameter to select API key and URL.
    const language = String(body.lang).toLowerCase();
    const selectedApiKey = language === "ar" ? AR_API_KEY : EN_API_KEY;
    const selectedApiHeader = language === "ar" ? "AR-API-Key" : "EN-API-Key";
    const apiUrl = `https://api.genexam.ai/api/${language}/query/generate-exam`;

    // Insert quiz into the "quizzes" table.
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .insert([
        {
          created_by: String(body.created_by),
          subject_id: String(body.subject_id),
          chapter: JSON.stringify(body.chapter),
          is_active: String(body.is_active),
          class: String(body.class),
          number_of_questions:
            Number(body.number_of_mcq_questions) +
            Number(body.number_of_true_false_questions),
          duration: String(body.duration),
          questions_types: body.questions_types,
          difficulty: String(body.difficulty),
          class_id: String(body.class_id),
          code: String(body.code),
          term_id: String(body.term_id),
        },
      ])
      .select("quiz_id");

    if (quizError) {
      console.error("Database Error (Quizzes):", quizError);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to insert quiz into database",
          httpStatus: 500,
        }),
        { status: 500 }
      );
    }

    const quizId = quizData[0].quiz_id;

    // Ensure no null values in chapter array
    const sanitizedChapter = Array.isArray(body.chapter)
      ? body.chapter.map(ch => String(ch).trim()).filter(ch => ch.length > 0)
      : [];

    if (sanitizedChapter.length === 0) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Chapter array cannot be empty",
          httpStatus: 400,
        }),
        { status: 400 }
      );
    }

    // Prepare the external API request body for live mode.
    const apiBody = {
      exam_difficulty_level: String(body.exam_difficulty_level || ""),
      educational_system: String(body.educational_system || ""),
      academic_year: String(body.academic_year || ""),
      semester: String(body.semester || ""),
      subject: String(body.subject || ""),
      chapter: sanitizedChapter,
      number_of_mcq_questions: Number(body.number_of_mcq_questions || 0),
      number_of_true_false_questions: Number(body.number_of_true_false_questions || 0)
    };

    // Verify live mode fields.
    for (const [key, value] of Object.entries(apiBody)) {
      if (!value && value !== 0) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: `Field '${key}' cannot be empty`,
            httpStatus: 400,
          }),
          { status: 400 }
        );
      }
    }

    console.log("API Request Body:", JSON.stringify(apiBody));
    console.log("API Endpoint:", apiUrl);
    console.log("API Header:", selectedApiHeader, "is set");

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        [selectedApiHeader]: selectedApiKey,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
      },
      body: JSON.stringify(apiBody),
    });

    console.log("API Response Status:", apiResponse.status, apiResponse.statusText);

    if (!apiResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await apiResponse.json();
      } catch (e) {
        errorDetails = await apiResponse.text();
      }
      console.error("API Error Details:", errorDetails);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch data from API",
          details: typeof errorDetails === "object" ? JSON.stringify(errorDetails) : errorDetails,
          requestBody: apiBody,
          apiUrl: apiUrl,
          headers: { [selectedApiHeader]: "****" },
          httpStatus: apiResponse.status,
        }),
        { status: 500 }
      );
    }

    const responseData = await apiResponse.json();
    console.log("API Response Data:", JSON.stringify(responseData).substring(0, 200) + "...");

    if (
      !responseData.exam ||
      !Array.isArray(responseData.exam.mcq_questions) ||
      !Array.isArray(responseData.exam.true_false_questions)
    ) {
      console.error("Exam generation failed; exam data is incomplete:", responseData.exam);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Exam generation failed: incomplete exam data. Possibly too many questions requested.",
          httpStatus: 500
        }),
        { status: 500 }
      );
    }

    const numberOfQuestions =
      responseData.exam.mcq_questions.length +
      responseData.exam.true_false_questions.length;

    // Insert MCQ and True/False questions into "questions" table.
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
          httpStatus: 500,
        }),
        { status: 500 }
      );
    }

    // Build options for MCQ and True/False questions.
    const optionsData: any[] = [];
    let mcqIndex = 0;
    insertedQuestions.forEach((question: any) => {
      if (question.question_type === "mcq") {
        const mcq = responseData.exam.mcq_questions[mcqIndex];
        const correctAnswer = mcq?.correct_answer;
        if (!correctAnswer) {
          console.error(`Missing correct_answer for MCQ question: ${mcq?.question}`);
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
          console.error(`Missing correct_answer for True/False question: ${trueFalseQuestion?.question}`);
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
            httpStatus: 500,
          }),
          { status: 500 }
        );
      }
    }

    // Update attempt status using the final API call.
    const updateKey = "TgR7pJwq9kD2nXzYbL1uVf3";
    const finalApiUrl = `${FINAL_API_BASE_URL}/${encodeURIComponent(String(body.version_test))}/api/1.1/wf/update_attempt_status?key=${updateKey}&bubble_quiz_id=${encodeURIComponent(String(body.bubble_quiz_id))}&attempt=${encodeURIComponent(String(body.attempt))}&quiz_id=${encodeURIComponent(String(quizId))}&number_of_questions=${encodeURIComponent(String(numberOfQuestions))}`;
    
    console.log("Final API URL:", finalApiUrl);

    const finalApiResponse = await fetch(finalApiUrl, { method: "GET" });
    const finalApiData = await finalApiResponse.json();
    console.log("Final API Response:", finalApiData);

    if (!finalApiResponse.ok) {
      console.error("Final API Error:", finalApiData);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to update exam status",
          details: finalApiData,
          httpStatus: 500,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Quiz, questions, and options inserted, and exam status updated successfully",
        finalApiResponse: finalApiData,
        httpStatus: 200,
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
        httpStatus: 500,
      }),
      { status: 500 }
    );
  }
});

// Helper function to validate live mode input parameters.
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
    "lang"
  ];
  const allFieldsPresent = requiredFields.every(field => parameters[field] !== undefined);
  const isChapterArray = Array.isArray(parameters.chapter);
  return allFieldsPresent && isChapterArray;
}
