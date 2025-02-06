# Welcome to the GenSystem Edge Functions Repository

Welcome to the **GenSystem Edge Functions** repository! This project contains a collection of Supabase Edge Functions designed to enhance the functionality and flexibility of your application.

---

## Overview

This repository includes the following edge functions:

1. **Answer Generation**
2. **Exam Generation**
3. **Comment Handler**
4. **Results Handler**

Each function is located in the `functions/` folder and is designed to be robust, scalable, and easy to integrate.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Edge Functions Overview](#edge-functions-overview)
  - [Answer Generation](#answer-generation)
  - [Exam Generation](#exam-generation)
  - [Comment Handler](#comment-handler)
  - [Results Handler](#results-handler)
- [How to Deploy](#how-to-deploy)
- [Contributing](#contributing)
- [License](#license)

---

## Getting Started

To explore the repository and use the edge functions:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/gensystem-edge-functions.git
   cd gensystem-edge-functions
   ```

2. **Navigate to the `functions/` folder:**
   ```bash
   cd functions
   ```

3. Each edge function is located in its respective folder:
   - `answer-generation`
   - `exam-generation`
   - `comment-handler`
   - `results-handler`

4. Follow the specific documentation for each edge function to configure and deploy it.

---

## Edge Functions Overview

### Answer Generation

- **Purpose**: Generate answers based on specific inputs.
- **Documentation**: Refer to the `README.md` file in the `functions/answer-generation/` folder for setup instructions and API details.
- **Key Features**:
  - Accepts question inputs and generates accurate, contextual answers.

---

### Exam Generation

- **Purpose**: Generate exams with custom configurations (e.g., difficulty, number of questions).
- **Documentation**: Refer to the `README.md` file in the `functions/exam-generation/` folder for setup instructions and API details.
- **Key Features**:
  - Supports multiple question types (MCQ, True/False).
  - Integrates with external APIs for dynamic question generation.

---

### Comment Handler

- **Purpose**: Insert, update, and fetch comments tied to specific entities (e.g., questions, attempts, students).
- **Documentation**: Refer to the `README.md` file in the `functions/comment-handler/` folder for setup instructions and API details.
- **Key Features**:
  - Validates input parameters to ensure robust error handling.
  - Supports dynamic queries for fetching and managing comments.

---

### Results Handler

- **Purpose**: Compute quiz results for a given user attempt, including correct, incorrect, and unanswered questions.
- **Endpoint**: `https://adbeenaoohcynafrzkjj.supabase.co/functions/v1/results-handler`
- **Documentation**: Refer to the `README.md` file in the `functions/results-handler/` folder for setup instructions and API details.
- **Key Features**:
  - Fetches total questions for a quiz.
  - Counts correct and wrong answers.
  - Calculates unanswered questions efficiently.

---

## How to Deploy

To deploy the edge functions:

1. **Install Supabase CLI:**
   Follow the [Supabase CLI setup guide](https://supabase.com/docs/guides/cli) to install and configure the CLI.

2. **Run Supabase Locally (Optional):**
   ```bash
   supabase start
   ```

3. **Deploy Edge Functions:**
   Navigate to the specific function folder and deploy:
   ```bash
   supabase functions deploy FUNCTION_NAME
   ```
   Replace `FUNCTION_NAME` with one of the following:
   - `answer-generation`
   - `exam-generation`
   - `comment-handler`
   - `results-handler`

---

## Contributing

We welcome contributions! If you'd like to contribute to this repository:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request for review.

---

## License

This repository is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

Thank you for exploring the GenSystem Edge Functions repository! We hope these functions help streamline your workflows and enhance your application's capabilities.
