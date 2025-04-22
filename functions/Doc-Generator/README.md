Exam Docs Generator Supabase Edge Function
=====================================

A Supabase Edge Function that generates DOCX exam papers with Arabic RTL support and stores them in Supabase Storage. It checks for a cached file before regenerating, and returns a public URL to the generated or cached document.

* * * * *

Table of Contents
-----------------

-   [Prerequisites](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#prerequisites)

-   [Environment Variables](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#environment-variables)

-   [Installation & Deployment](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#installation--deployment)

-   [API Endpoint](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#api-endpoint)

    -   [Request](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#request)

    -   [Responses](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#responses)

-   [Caching Logic](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#caching-logic)

-   [Data Models](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#data-models)

-   [Core Functions](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#core-functions)

    -   [`fetchExamData`](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#fetchexamdata)

    -   [`containsArabic`](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#containsarabic)

    -   [`getOptionLabels`](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#getoptionlabels)

    -   [`isArabicExam`](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#isarabicexam)

    -   [`generateDocx`](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#generatedocx)

-   [Error Handling](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#error-handling)

-   [Example Usage](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#example-usage)

-   [Contributing](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#contributing)

-   [License](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/68077a89-e168-8011-af03-c4d9c6ee768e#license)

* * * * *

Prerequisites
-------------

-   **Supabase Project** with tables:

    -   `quizzes`

    -   `users` (fields: `user_id`, `username`)

    -   `subjects` (fields: `subject_id`, `subject_name`)

    -   `questions` (fields: `question_id`, `quiz_id`, `question_text`)

    -   `options` (fields: `option_id`, `question_id`, `option_text`, `is_correct`)

-   **Supabase Storage** bucket named `exam-pdfs`

-   **Deno** runtime (tested with Deno v1.30+)

* * * * *

Environment Variables
---------------------

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

Set these in your environment or in a `.env` file loaded by Deno.

* * * * *

Installation & Deployment
-------------------------

1.  **Clone the repository**

    ```
    git clone <repo-url> exam-generator
    cd exam-generator

    ```

2.  **Deploy to Supabase**

    ```
    supabase functions deploy exam-generator --project-ref <your-project-ref>

    ```

3.  **Invoke the function**

    -   Via HTTP POST to `https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/pdf-generator`

* * * * *

API Endpoint
------------

### POST `/`

Generates (or returns cached) DOCX exam file for a given `quiz_id`.

#### Request

| Field | Type | Description |
| --- | --- | --- |
| `quiz_id` | number | ID of the quiz to generate PDF |

**Headers**: `Content-Type: application/json`

```
{
  "quiz_id": 123
}

```

#### Responses

-   **200 OK** (cached)

    ```
    {
      "docxUrl": "https://.../quiz_123.docx",
      "cached": true
    }

    ```

-   **200 OK** (newly generated)

    ```
    {
      "docxUrl": "https://.../quiz_123.docx"
    }

    ```

-   **400 Bad Request**

    ```
    { "error": "Invalid quiz_id. Must be a number." }

    ```

-   **405 Method Not Allowed**

    ```
    { "error": "Method not allowed" }

    ```

-   **500 Internal Server Error**

    ```
    { "error": "Internal server error" }

    ```

* * * * *

Caching Logic
-------------

1.  List files in the `exam-pdfs` bucket, searching for `quiz_<quiz_id>.docx`.

2.  If found, return the public URL with `{ cached: true }`.

3.  Otherwise, proceed to fetch data and generate a new DOCX.

* * * * *

Data Models
-----------

```
interface Quiz {
  quiz_id: number;
  created_by: number;
  subject_id: number;
  duration: number;
}

interface User {
  user_id: number;
  username: string;
}

interface Subject {
  subject_id: number;
  subject_name: string;
}

interface Question {
  question_id: number;
  quiz_id: number;
  question_text: string;
}

interface Option {
  option_id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
}

interface QuestionWithOptions extends Question {
  options: Option[];
}

interface ExamData {
  quiz: Quiz;
  instructor: string;
  subject: string;
  questions: QuestionWithOptions[];
}

```

* * * * *

Core Functions
--------------

### `fetchExamData(quizId: number): Promise<ExamData>`

-   **Purpose**: Retrieve quiz metadata, instructor username, subject name, questions, and their options.

-   **Throws** if any record is missing.

```
async function fetchExamData(quizId: number): Promise<ExamData> { ... }

```

* * * * *

### `containsArabic(text: string): boolean`

-   **Purpose**: Detect presence of Arabic characters using Unicode range `\u0600-\u06FF`.

```
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

```

* * * * *

### `getOptionLabels(isArabic: boolean): string[]`

-   **Purpose**: Return choice labels (`أ, ب, ج...` for Arabic, `A, B, C...` otherwise).

```
function getOptionLabels(isArabic: boolean): string[] { ... }

```

* * * * *

### `isArabicExam(examData: ExamData): boolean`

-   **Purpose**: Determine if >40% of content is Arabic to set document RTL.

-   **Counts** subject, instructor, question texts, and all options.

```
function isArabicExam(examData: ExamData): boolean { ... }

```

* * * * *

### `generateDocx(examData: ExamData): Promise<Uint8Array>`

-   **Purpose**: Build a DOCX file using `docx` library:

    -   Header with subject, instructor, duration

    -   RTL/LTR alignment per paragraph

    -   Numbered questions and indented options

    -   Section-level RTL if Arabized

```
async function generateDocx(examData: ExamData): Promise<Uint8Array> { ... }

```

* * * * *

Error Handling
--------------

-   **400**: Invalid or missing `quiz_id`.

-   **405**: Non-POST requests.

-   **500**: Any unexpected errors, logged to console.

* * * * *

Example Usage
-------------

Add test calls:

```
# 1. Generate exam for quiz ID 123
curl -X POST https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/pdf-generator\
  -H "Content-Type: application/json"\
  -d '{"quiz_id": 123}'
# Expected response:
# { "docxUrl": "https://.../quiz_123.docx" }

```

```
# 2. Download the generated DOCX file
curl -L $(curl -s -X POST https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/pdf-generator\
    -H "Content-Type: application/json"\
    -d '{"quiz_id": 123}' | jq -r .docxUrl) -o quiz_123.docx

```

```
# 3. Test invalid quiz_id
curl -X POST https://<project-ref>.functions.supabase.co/exam-generator\
  -H "Content-Type: application/json"\
  -d '{"quiz_id": "abc"}'
# Expected 400 Bad Request:
# { "error": "Invalid quiz_id. Must be a number." }
