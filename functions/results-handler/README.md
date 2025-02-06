# Results Handler Edge Function Documentation

## Overview
The `results-handler` is a Supabase Edge Function designed to fetch the count of correct answers, wrong answers, and unanswered questions for a given quiz attempt.

### Endpoint
```
POST https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler
```

---

## Request Structure
The function expects a JSON payload with the following parameters:

### Parameters
| Parameter   | Type   | Required | Description                              |
|-------------|--------|----------|------------------------------------------|
| `user_id`   | `int`  | Yes      | ID of the user taking the quiz.          |
| `quiz_id`   | `int`  | Yes      | ID of the quiz.                          |
| `attempt_id`| `int`  | Yes      | ID of the specific quiz attempt.         |

### Example Request Body
```json
{
  "user_id": 1,
  "quiz_id": 10,
  "attempt_id": 25
}
```

---

## Response Structure
The function returns a JSON response with the status of the operation and the count of correct, wrong, and unanswered questions.

### Example Success Response
```json
{
  "status": "success",
  "data": {
    "correct_answers": 15,
    "wrong_answers": 2,
    "unanswered_questions": 3
  }
}
```

### Example Error Response
```json
{
  "status": "error",
  "message": "Failed to fetch total questions",
  "details": "column questions.question_id does not exist"
}
```

### Response Fields
| Field                  | Type     | Description                                         |
|------------------------|----------|-----------------------------------------------------|
| `status`               | `string` | The status of the request, either `success` or `error`. |
| `data`                 | `object` | Contains the results data on success.              |
| `data.correct_answers` | `int`    | Count of correct answers.                          |
| `data.wrong_answers`   | `int`    | Count of wrong answers.                            |
| `data.unanswered_questions` | `int` | Count of unanswered questions.                     |
| `message`              | `string` | Error message (only present on errors).            |
| `details`              | `string` | Additional error details (only present on errors). |

---

## Implementation Details
The function processes the input parameters to:
1. Fetch the total number of questions for the provided `quiz_id`.
2. Count the correct and wrong answers by querying the `answers` table.
3. Calculate unanswered questions as the difference between total questions and answered questions.

### Key Queries
- **Fetching Total Questions:**
```sql
SELECT COUNT(*) AS total_questions 
FROM questions 
WHERE quiz_id = $quiz_id;
```

- **Fetching Answer Counts:**
```sql
SELECT 
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct_answers,
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS wrong_answers
FROM answers
WHERE user_id = $user_id AND quiz_id = $quiz_id AND attempt_id = $attempt_id;
```

---

## Error Handling
- Validates input parameters for existence and correctness.
- Returns descriptive error messages for:
  - Missing or invalid input parameters.
  - Database query failures.

---

## Usage Notes
- Ensure the `questions` table uses the column `question_id` instead of `id`.
- Test the function with various scenarios to ensure correctness, especially for edge cases like:
  - Zero answered questions.
  - All questions answered correctly.
  - All questions answered incorrectly.

---

## Deployment Notes
1. Deploy the function to your Supabase project.
2. Use the provided endpoint for API calls.
3. Monitor logs in the Supabase dashboard for debugging and performance insights.

---

## Example Integration
### cURL Request Example
```bash
curl -X POST \
  'https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": 1,
    "quiz_id": 10,
    "attempt_id": 25
  }'
```

---

## License
This project is licensed under the [MIT License](LICENSE).
