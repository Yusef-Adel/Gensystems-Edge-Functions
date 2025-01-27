
# **Answer Generation Edge Function Documentation**

## **Function Overview**
The Answer Generation Edge Function processes user answers in a quiz system. It validates the provided answer, checks correctness, and inserts or updates the `answers` table. If no `attempt_id` exists, the function automatically creates a new attempt in the `attempts` table.

---

## **Endpoint**
```
POST https://<YOUR_SUPABASE_PROJECT>.functions.supabase.co/answer-generation
```

---

## **Authorization**
- **Header**: `Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>`

---

## **Request Parameters**

### **Required Parameters**
| Parameter      | Type     | Description                                                   |
|----------------|----------|---------------------------------------------------------------|
| `user_id`      | `integer`| ID of the user submitting the answer.                         |
| `option_id`    | `integer`| ID of the selected option for the question.                   |
| `question_id`  | `integer`| ID of the question being answered.                            |
| `quiz_id`      | `integer`| ID of the quiz being attempted.                               |

### **Optional Parameters**
| Parameter      | Type     | Description                                                   |
|----------------|----------|---------------------------------------------------------------|
| `answer_text`  | `string` | Text of the answer if applicable (e.g., for open-ended answers).|
| `score`        | `float`  | Score for the answer (if applicable).                         |
| `is_correct`   | `boolean`| Indicates whether the answer is correct or not.               |
| `comment`      | `string` | Any comment or feedback related to the answer.                |

---

## **Function Logic**

### **1. Validate Input**
- Ensure all required parameters (`user_id`, `option_id`, `question_id`, `quiz_id`) are provided.

### **2. Check or Create Attempt**
- Query the `attempts` table to check if an attempt exists for the given `user_id` and `quiz_id`.
- If no attempt exists:
  - Create a new attempt in the `attempts` table with `status_id` set to `6` ("Started").
  - Automatically use the generated `attempt_id` for the answer.

### **3. Validate `option_id` and `question_id`**
- Query the `options` table to check if the provided `option_id` is valid for the given `question_id`.
- If invalid, return a `400` error with debug information.

### **4. Check for Existing Answer**
- Query the `answers` table to check if an answer already exists for the given `user_id`, `question_id`, and `attempt_id`.
- **If an answer exists**:
  - Update the existing answer with the new data.
- **If no answer exists**:
  - Insert a new record into the `answers` table.

### **5. Determine Correctness**
- The `is_correct` field is determined based on the `is_correct` value from the `options` table.

---

## **Response**

### **Success Response**
- **Status Code**: `200 OK`
- **Body**:
```json
{
  "status": "success",
  "message": "Answer created successfully"
}
```
OR
```json
{
  "status": "success",
  "message": "Answer updated successfully"
}
```

### **Error Responses**

#### **Validation Error**
- **Status Code**: `400 Bad Request`
- **Body**:
```json
{
  "status": "error",
  "message": "Missing required parameters: user_id, option_id, question_id, quiz_id"
}
```

#### **Invalid Option or Question**
- **Status Code**: `400 Bad Request`
- **Body**:
```json
{
  "status": "error",
  "message": "Invalid option_id or question_id: No matching option found"
}
```

#### **Internal Server Error**
- **Status Code**: `500 Internal Server Error`
- **Body**:
```json
{
  "status": "error",
  "message": "An unexpected error occurred",
  "details": "Error details here"
}
```

---

## **Dependencies**

### **Supabase Tables**
1. **`answers` Table**:
   - Stores user answers.

2. **`options` Table**:
   - Contains options for each question, including correctness information.

3. **`attempts` Table**:
   - Tracks quiz attempts by users.

4. **`attempt_statuses` Table**:
   - Contains statuses like "Started," "Completed," etc.

### **Relationships**
- `options.question_id` → `questions.id`
- `answers.option_id` → `options.option_id`
- `answers.attempt_id` → `attempts.attempt_id`
- `attempts.quiz_id` → `quizzes.quiz_id`

---

## **Example Request**
### **cURL Command**
```bash
curl -X POST 'https://<YOUR_SUPABASE_PROJECT>.functions.supabase.co/answer-generation' \
-H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \
-H "Content-Type: application/json" \
-d '{
  "user_id": 37,
  "option_id": 1898,
  "question_id": 606,
  "quiz_id": 15,
  "answer_text": "This is an example answer",
  "score": 5,
  "comment": "Good attempt"
}'
```

---

## **Notes**
- `attempt_id` is no longer required as it is generated automatically if not present.
- Ensure that the `quiz_id` and `status_id` values exist in the `quizzes` and `attempt_statuses` tables, respectively.
