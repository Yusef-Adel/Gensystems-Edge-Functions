Edge Function: Comment Management API
This edge function is designed to handle the insertion, updating, and fetching of comments for a specific question, attempt, and student in a Supabase database. It is built using Deno and integrates with Supabase for database operations.

Table of Contents
Overview

Environment Variables

API Endpoint

Request Body

Response Format

Error Handling

Examples

Dependencies

Overview
The edge function serves as an API endpoint to:

Insert or update a comment in the answers_comment table.

Fetch comments from the answers_comment table based on provided parameters.

The function uses the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables to connect to the Supabase database.

Environment Variables
The following environment variables are required for the function to work:

SUPABASE_URL: The URL of your Supabase project.

SUPABASE_SERVICE_ROLE_KEY: The service role key for your Supabase project.

API Endpoint
The function is served at the root endpoint (/). It accepts POST requests with a JSON body.

Request Body
The request body must be a JSON object with the following fields:

Field	Type	Required	Description
is_insert	Boolean	Yes	true for insert/update operations, false for fetching comments.
question_id	String	Yes	The ID of the question associated with the comment.
attempt_id	String	Yes	The ID of the attempt associated with the comment.
student_id	String	Yes	The ID of the student associated with the comment.
comment_text	String	Conditional	Required if is_insert is true. The text of the comment to insert/update.
Response Format
The response is a JSON object with the following structure:

Field	Type	Description
status	String	The status of the operation (success or error).
status_code	Number	The HTTP status code of the response.
message	String	A message describing the result of the operation.
data	Object	The data returned by the operation (e.g., inserted/updated comment or fetched comments).
Error Handling
The function handles errors gracefully and returns appropriate HTTP status codes and error messages. Common errors include:

400 Bad Request: Missing or invalid required fields.

404 Not Found: No comments found for the provided parameters.

500 Internal Server Error: Database or unexpected errors.

Examples
Insert/Update a Comment
Request:

json
Copy
{
  "is_insert": true,
  "question_id": "q1",
  "attempt_id": "a1",
  "student_id": "s1",
  "comment_text": "This is a sample comment."
}
Response:

json
Copy
{
  "status": "success",
  "status_code": 200,
  "message": "Comment added successfully.",
  "data": {
    "comment_id": "c1",
    "comment_text": "This is a sample comment."
  }
}
Fetch Comments
Request:

json
Copy
{
  "is_insert": false,
  "question_id": "q1",
  "attempt_id": "a1",
  "student_id": "s1"
}
Response:

json
Copy
{
  "status": "success",
  "status_code": 200,
  "message": "Comments fetched successfully.",
  "data": [
    {
      "comment_id": "c1",
      "question_id": "q1",
      "attempt_id": "a1",
      "student_id": "s1",
      "comment_text": "This is a sample comment."
    }
  ]
}
