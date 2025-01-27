# Supabase Edge Function: Comment Handler

This Edge Function allows for inserting, updating, and fetching comments in the `answers_comment` table.

---

## Features

- **Insert/Update Comments**: Add or update comments in the database based on `question_id`, `attempt_id`, and `student_id`.
- **Fetch Comments**: Retrieve comments based on all three parameters (`question_id`, `attempt_id`, `student_id`).
- **Robust Error Handling**: Handles invalid JSON payloads, missing parameters, and database errors.
- **Consistent Responses**: Returns clear and descriptive messages along with HTTP status codes.

---

## Request Structure

### HTTP Method
POST

### Request Headers
| Header              | Value                       |
|---------------------|-----------------------------|
| `Content-Type`      | `application/json`          |
| `Authorization`     | `Bearer YOUR_AUTH_TOKEN`    |

### Request Body
The request body must be a JSON object with the following fields:

#### For Insert/Update
| Field          | Type    | Required | Description                                      |
|----------------|---------|----------|--------------------------------------------------|
| `is_insert`    | Boolean | Yes      | Set to `true` for insert/update operations.      |
| `question_id`  | Number  | Yes      | The ID of the question.                         |
| `attempt_id`   | Number  | Yes      | The ID of the attempt.                          |
| `student_id`   | Number  | Yes      | The ID of the student.                          |
| `comment_text` | String  | Yes      | The text of the comment.                        |

#### For Fetch
| Field          | Type    | Required | Description                                      |
|----------------|---------|----------|--------------------------------------------------|
| `is_insert`    | Boolean | Yes      | Set to `false` for fetch operations.            |
| `question_id`  | Number  | Yes      | The ID of the question.                         |
| `attempt_id`   | Number  | Yes      | The ID of the attempt.                          |
| `student_id`   | Number  | Yes      | The ID of the student.                          |

---

## Response Structure

### Success Responses

#### Insert/Update Success
```json
{
  "status": "success",
  "status_code": 200,
  "message": "Comment added successfully.",
  "data": {
    "comment_id": 123,
    "question_id": 1,
    "attempt_id": 2,
    "student_id": 3,
    "comment_text": "This is a test comment",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Fetch Success
```json
{
  "status": "success",
  "status_code": 200,
  "message": "Comments fetched successfully.",
  "data": [
    {
      "comment_id": 123,
      "question_id": 1,
      "attempt_id": 2,
      "student_id": 3,
      "comment_text": "This is a test comment",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Error Responses

#### Invalid JSON Payload
```json
{
  "status": "error",
  "status_code": 400,
  "message": "Invalid JSON payload. Please provide valid JSON in the request body."
}
```

#### Missing Parameters (Insert/Update)
```json
{
  "status": "error",
  "status_code": 400,
  "message": "Missing required fields for insert/update: question_id, attempt_id, student_id, or comment_text."
}
```

#### Missing Parameters (Fetch)
```json
{
  "status": "error",
  "status_code": 400,
  "message": "All parameters (question_id, attempt_id, student_id) are required for fetching data."
}
```

#### No Data Found
```json
{
  "status": "error",
  "status_code": 404,
  "message": "No comments found for the provided parameters."
}
```

#### Database Error
```json
{
  "status": "error",
  "status_code": 500,
  "message": "Failed to fetch comments from the database."
}
```

#### Unexpected Error
```json
{
  "status": "error",
  "status_code": 500,
  "message": "An unexpected error occurred.",
  "details": "Detailed error message."
}
```

---

## Example Requests

### Insert/Update Request
```bash
curl -X POST 'https://YOUR_SUPABASE_FUNCTION_URL' \
--header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "is_insert": true,
  "question_id": 1,
  "attempt_id": 2,
  "student_id": 3,
  "comment_text": "This is a test comment"
}'
```

### Fetch Request
```bash
curl -X POST 'https://YOUR_SUPABASE_FUNCTION_URL' \
--header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
  "is_insert": false,
  "question_id": 1,
  "attempt_id": 2,
  "student_id": 3
}'
```

---

## Notes
- Ensure all required fields are provided to avoid validation errors.
- Use the correct `Authorization` token to authenticate requests.

