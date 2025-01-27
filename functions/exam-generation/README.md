
# Updated API Documentation for Quiz Edge Function

## Purpose

This Edge Function:
1. **Generates a quiz** based on provided parameters.
2. **Stores the quiz** along with its questions and options into the database.
3. **Calls an external API** to update the attempt status after successful insertion, including the generated `quiz_id`.

---

## Endpoint

- **URL**:  
  - Local: `http://localhost:54321/functions/v1/exam-generation`  
  - Production: `https://<YOUR_SUPABASE_PROJECT>.functions.supabase.co/functions/v1/exam-generation`

- **Method**: `POST`

---

## Parameters

### **Required Parameters**

| Parameter                  | Type      | Description                                                                                     |
|----------------------------|-----------|-------------------------------------------------------------------------------------------------|
| `exam_difficulty_level`    | `string`  | The difficulty level of the exam (e.g., `easy`, `medium`, `hard`).                             |
| `educational_system`       | `string`  | The name of the educational system (e.g., `CBSE`, `IB`).                                       |
| `academic_year`            | `string`  | The academic year for the quiz (e.g., `2023`).                                                |
| `semester`                 | `string`  | The semester of the academic year (e.g., `First`, or semester ID like `7`).                   |
| `subject`                  | `string`  | The name of the subject (e.g., `Mathematics`, `Science`).                                      |
| `chapter`                  | `string`  | The chapter of the subject to generate questions from (e.g., `Geometry`, `Algebra`).          |
| `number_of_mcq_questions`  | `number`  | The number of MCQ (multiple-choice questions) to generate.                                     |
| `number_of_true_false_questions` | `number` | The number of True/False questions to generate.                                               |
| `created_by`               | `number`  | The user ID of the quiz creator (must exist in the `users` table).                             |
| `subject_id`               | `number`  | The ID of the subject (must exist in the `subjects` table).                                    |
| `is_active`                | `boolean` | Whether the quiz is active or not (e.g., `true`, `false`).                                     |
| `class`                    | `string`  | The class the quiz is intended for (e.g., `10A`, `15A`).                                       |
| `duration`                 | `number`  | The duration of the quiz in minutes (e.g., `30`, `60`).                                        |
| `questions_types`          | `array`   | The types of questions included in the quiz (e.g., `['mcq', 'true_false']`).                 |
| `difficulty`               | `string`  | The overall difficulty level of the quiz (e.g., `medium`, `hard`).                            |
| `class_id`                 | `number`  | The ID of the class (if applicable).                                                          |
| `code`                     | `string`  | A unique code for the quiz (e.g., `quiz-code-123`).                                            |
| `term_id`                  | `number`  | The term/semester ID (must exist in the `semester` table).                                     |
| `attempt`                  | `string`  | The unique reference ID for the attempt status to be updated (e.g., `1737304893057x361394713141968900`). |
| `version_test`             | `string`  | The version to use for the external API call (e.g., `version-test`).                          |
| `bubble_quiz_id`           | `string`  | The unique bubble quiz ID for the final API call.                                             |

---

## Example Request

### **Request URL**
```bash
https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/exam-generation
```

### **Request Headers**
```json
{
  "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
  "Content-Type": "application/json"
}
```

### **Request Body**
```json
{
  "exam_difficulty_level": "medium",
  "educational_system": "CBSE",
  "academic_year": "2023",
  "semester": "7",
  "subject": "Mathematics",
  "chapter": "Geometry",
  "number_of_mcq_questions": 5,
  "number_of_true_false_questions": 5,
  "created_by": 37,
  "subject_id": 18,
  "is_active": true,
  "class": "15A",
  "duration": 30,
  "questions_types": ["mcq", "true_false"],
  "difficulty": "medium",
  "class_id": 13,
  "code": "quiz-code-123",
  "term_id": 7,
  "attempt": "1737304893057x361394713141968900",
  "version_test": "version-test",
  "bubble_quiz_id": "1737834765398x969376658481400600"
}
```

---

## Response

### **Success Response**
```json
{
  "status": "success",
  "message": "Quiz, questions, options inserted, and exam status updated successfully",
  "finalApiResponse": { "your_final_api_response_data_here" }
}
```

### **Error Responses**

#### **Validation Error** (Missing or invalid parameters)
```json
{
  "status": "error",
  "error": {
    "parameter": "missing_or_invalid",
    "message": "Invalid or missing parameters"
  }
}
```

#### **Database Insertion Error**
```json
{
  "status": "error",
  "message": "Failed to insert questions into database",
  "details": { "your_database_error_details_here" }
}
```

#### **Final API Call Error**
```json
{
  "status": "error",
  "message": "Failed to update exam status",
  "details": { "your_final_api_error_details_here" }
}
```

---

## Database Tables and Relations

### **Tables Used**

- **`quizzes`**: Stores the main quiz information.
- **`questions`**: Stores the questions for each quiz.
- **`options`**: Stores the answer options for multiple-choice and true/false questions.

### **Foreign Key Relations**

1. `created_by` → `users.user_id`
2. `subject_id` → `subjects.subject_id`
3. `term_id` → `semester.semester_id`

---

## Key Notes

- Ensure that `created_by`, `subject_id`, and `term_id` values exist in their respective tables before making the request.
- The `attempt`, `version_test`, and `bubble_quiz_id` parameters are dynamic and should be passed in the request body to call the external API.
- The generated `quiz_id` is included in the final API call to associate the quiz with its status update.
