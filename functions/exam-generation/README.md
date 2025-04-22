Exam Generation Edge Function
=============================

This document describes the Supabase Edge Function that generates and returns exams in both **test** and **live** modes. It handles:

-   **Test mode**: No DB writes, calls the external test API, returns generated exam JSON plus metadata.

-   **Live mode**: Inserts a new `quiz` record, generates exam via external API, writes questions & options to the database, updates attempt status, and returns success.

* * * * *

Table of Contents
-----------------

1.  [Requirements & Imports](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#requirements--imports)

2.  [Environment Variables](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#environment-variables)

3.  [API Keys & Modes](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#api-keys--modes)

4.  [HTTP Endpoint](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#http-endpoint)

5.  [Request Payload](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#request-payload)

6.  [Test Mode Flow](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#test-mode-flow)

7.  [Live Mode Flow](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#live-mode-flow)

8.  [Database Schema](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#database-schema)

9.  [Validation Logic](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#validation-logic)

10. [Error Handling](https://chatgpt.com/g/g-p-67f7c2fb9efc8191a6bc4795f4fb61a0-youssef-adel/c/6800cd71-cbc4-8011-980e-6ce0ed4ada5d?model=o4-mini-high#error-handling)

* * * * *

Requirements & Imports
----------------------

```
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

```

-   **Deno std/http** for serving requests

-   **@supabase/supabase-js v2** for DB & Storage

* * * * *

Environment Variables
---------------------

-   `SUPABASE_URL`

-   `SUPABASE_SERVICE_ROLE_KEY`

Used to initialize the Supabase client:

```
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

```

* * * * *

API Keys & Modes
----------------

-   **Live Mode** uses:

    -   `AR_API_KEY` (Arabic)

    -   `EN_API_KEY` (English)

-   **Test Mode** uses:

    -   `AR_TEST_API_KEY`

    -   `EN_TEST_API_KEY`

All calls go to `https://genexam.ai` (live) or `https://test.genexam.ai` (test).

* * * * *

HTTP Endpoint
-------------

```
POST /functions/v1/exam-generation
Content-Type: application/json
Authorization: Bearer <SUPABASE_JWT>

```

-   Only `POST` is allowed.

-   Returns `application/json`.

* * * * *

Request Payload
---------------

Common fields:

| Field | Type | Required in Live | Description |
| --- | --- | --- | --- |
| `mode` | `string` | No (default=live) | `"live"` or `"test"` |
| `lang` | `string` | Yes | `"ar"` or `"en"` |
| `exam_difficulty_level` | `string` | Yes | Difficulty (e.g. `"سهل"` / `"easy"`) |
| `educational_system` | `string` | Yes | Curriculum name |
| `academic_year` | `string` | Yes | Grade/year |
| `semester` | `string` | Yes | Semester identifier |
| `subject` | `string` | Yes | Subject name |
| `chapter` | `string[]` | Yes | List of chapters |
| `number_of_mcq_questions` | `number` | Yes | Count of MCQs |
| `number_of_true_false_questions` | `number` | Yes | Count of True/False |
| `attempt_id` | `string` | Test only | Student's attempt identifier |
| `bubble_quiz_id` | `string` | Test only | Bubble.io quiz ID for status update in test mode |

Live‐only additional fields:

| Field | Type | Required in Live | Description |
| --- | --- | --- | --- |
| `created_by` | `string` | Yes | User ID of quiz creator |
| `subject_id` | `string` | Yes | Foreign key to `subjects` table |
| `is_active` | `string` | Yes | `"true"` / `"false"` |
| `class` | `string` | Yes | Class name/identifier |
| `duration` | `string` | Yes | Duration in minutes |
| `questions_types` | --- | Yes | Array of question types |
| `difficulty` | `string` | Yes | Overall quiz difficulty |
| `class_id`, `code`, `term_id` | `string` | Yes | Additional quiz metadata |

* * * * *

Test Mode Flow
--------------

1.  **Validate** required test fields.

2.  **Determine** `language` (`ar`/`en`).

3.  **Set** `selectedApiKey` and header (`AR-API-Key` / `EN-API-Key`).

4.  **POST** to `https://test.genexam.ai/api/{lang}/query/generate-exam`.

5.  **On success**, attach `metadata = { attempt_id, bubble_quiz_id }`.

6.  **Return** `{ status: "success", data: <API response> }`.

* * * * *

Live Mode Flow
--------------

1.  **Validate** all live mode parameters.

2.  **Select** API key & URL (`https://api.genexam.ai/api/{lang}/...`).

3.  **Insert** a new row in `quizzes` table, retrieve `quiz_id`.

4.  **Sanitize** chapter array, re‑validate.

5.  **Build** `apiBody` for external API.

6.  **Fetch** exam from external API.

7.  **Validate** `responseData.exam.mcq_questions` & `true_false_questions`.

8.  **Insert** into `questions` table (MCQ + True/False).

9.  **Build & Insert** `options` rows with `is_correct`.

10. **Update** external status via GET to GenExam webhook.

11. **Return** `{ status: "success", finalApiResponse: ... }`.

* * * * *

Database Schema
---------------

```
-- quizzes
quiz_id        int4 PRIMARY KEY
created_by     int4 NOT NULL
subject_id     int4 NOT NULL
duration       int4 NOT NULL
-- users
user_id        int4 PRIMARY KEY
username       varchar NOT NULL
-- subjects
subject_id     int4 PRIMARY KEY
subject_name   varchar NOT NULL
-- questions
question_id    int4 PRIMARY KEY
quiz_id        int4 REFERENCES quizzes
question_text  text
question_type  varchar
-- options
option_id      int4 PRIMARY KEY
question_id    int4 REFERENCES questions
option_text    text
is_correct     boolean

```

* * * * *

Validation Logic
----------------

-   **Test mode**: all listed fields must be non‑empty (`string` non‑blank, `array` non‑empty).

-   **Live mode**: every field in `requiredFields` must exist; `chapter` must be an array.

* * * * *

Error Handling
--------------

-   **HTTP method** ≠ POST → `405 Method Not Allowed`.

-   **Invalid JSON** → `400 Invalid JSON payload`.

-   **Missing/invalid params** → `400` with descriptive message.

-   **DB errors** → `500` with context (`quiz not found`, `insert failed`).

-   **External API errors** → `500`, logs response body/details.

* * * * *
