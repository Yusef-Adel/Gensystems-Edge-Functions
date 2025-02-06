# Results Handler Edge Function

## Overview

This Supabase Edge Function, hosted at `https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler`, calculates and returns the count of correct, wrong, and unanswered questions for a given user in a specific quiz attempt.

---

## Parameters

### Input Parameters
- **user_id** (integer): ID of the user.
- **quiz_id** (integer): ID of the quiz.
- **attempt_id** (integer): ID of the quiz attempt.

### Sample Request Body
```json
{
  "user_id": 123,
  "quiz_id": 456,
  "attempt_id": 789
}
```

---

## Response

### Successful Response
- **Status:** `200 OK`
- **Response Body:**
```json
{
  "status": "success",
  "data": {
    "correct_answers": 15,
    "wrong_answers": 1,
    "unanswered_questions": 4
  }
}
```

### Error Response
- **Status:** `400 Bad Request` or `500 Internal Server Error`
- **Response Body:**
```json
{
  "status": "error",
  "message": "Error message here",
  "details": "Detailed error message here"
}
```

---

## Implementation

### Code
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const body = await req.json();
    const { user_id, quiz_id, attempt_id } = body;

    if (!user_id || !quiz_id || !attempt_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing or invalid parameters",
        }),
        { status: 400 }
      );
    }

    // Get total questions for the quiz
    const { count: totalQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("question_id", { count: "exact" })
      .eq("quiz_id", quiz_id);

    if (questionsError) {
      throw new Error("Failed to fetch total questions");
    }

    // Get user answers for the attempt
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("is_correct")
      .eq("attempt_id", attempt_id)
      .eq("user_id", user_id);

    if (answersError) {
      throw new Error("Failed to fetch user answers");
    }

    const correctAnswers = answers.filter((answer) => answer.is_correct).length;
    const wrongAnswers = answers.filter((answer) => !answer.is_correct).length;
    const unansweredQuestions = totalQuestions - correctAnswers - wrongAnswers;

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          unanswered_questions: unansweredQuestions,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
        details: error.stack,
      }),
      { status: 500 }
    );
  }
});
```

---

## Deployment Instructions

1. **Initialize Supabase Edge Functions:**
   - Ensure your Supabase CLI is installed and authenticated.
   - Place the function code in the `functions/results-handler/index.ts` file in your Supabase project.

2. **Deploy the Function:**
   ```bash
   supabase functions deploy results-handler
   ```

3. **Set Environment Variables:**
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.

4. **Test the Endpoint:**
   Use tools like `curl`, Postman, or your frontend application to test the function.

---

## Example Usage

### Example cURL Request
```bash
curl -X POST \
  'https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": 123,
    "quiz_id": 456,
    "attempt_id": 789
  }'
```

### Example JavaScript Fetch Request
```javascript
fetch("https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    user_id: 123,
    quiz_id: 456,
    attempt_id: 789,
  }),
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Error:", error));
```

---

## Notes
- Ensure your Supabase project has the required `questions` and `answers` tables with appropriate columns.
- Properly secure your Supabase service role key.
- Test thoroughly to handle edge cases like missing data or invalid parameters.
