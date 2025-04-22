// exam-generator/index.ts
// Supabase Edge Function: generate and store DOCX exam papers only (Arabic RTL support)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import {
  Document,
  Paragraph,
  TextRun,
  TabStopPosition,
  TabStopType,
  BorderStyle,
  AlignmentType,
  Packer
} from "https://esm.sh/docx@8.0.4";

// --- Type definitions ---
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

// --- Initialize Supabase client ---
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { quiz_id } = await req.json();
    if (!quiz_id || typeof quiz_id !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid quiz_id. Must be a number." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const bucket = "exam-pdfs";
    const docxPath = `quiz_${quiz_id}.docx`;

    // 1) Check for cached DOCX
    const { data: files, error: listErr } = await supabase
      .storage
      .from(bucket)
      .list("", { search: docxPath });

    if (!listErr && files?.some(f => f.name === docxPath)) {
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(docxPath);
      return new Response(
        JSON.stringify({ docxUrl: urlData.publicUrl, cached: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Fetch all exam data
    const examData = await fetchExamData(quiz_id);

    // 3) Generate DOCX bytes (RTL for Arabic)
    const docxBytes = await generateDocx(examData);

    // 4) Upload to Supabase Storage (upsert)
    const { error: uploadErr } = await supabase
      .storage
      .from(bucket)
      .upload(docxPath, docxBytes, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true
      });
    if (uploadErr) throw uploadErr;

    // 5) Get public URL
    const { data: urlData } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(docxPath);

    return new Response(
      JSON.stringify({ docxUrl: urlData.publicUrl }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("exam-generator error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Fetches quiz, instructor, subject, questions & options
 */
async function fetchExamData(quizId: number): Promise<ExamData> {
  const { data: quiz, error: qe } = await supabase
    .from("quizzes").select("*").eq("quiz_id", quizId).single();
  if (qe || !quiz) throw new Error("Quiz not found");

  const { data: user, error: ue } = await supabase
    .from("users").select("username").eq("user_id", quiz.created_by).single();
  if (ue || !user) throw new Error("Instructor not found");

  const { data: subj, error: se } = await supabase
    .from("subjects").select("subject_name").eq("subject_id", quiz.subject_id).single();
  if (se || !subj) throw new Error("Subject not found");

  const { data: questions, error: qe2 } = await supabase
    .from("questions").select("*").eq("quiz_id", quizId);
  if (qe2 || !questions) throw new Error("Questions not found");

  const questionsWithOptions: QuestionWithOptions[] = [];
  for (const q of questions) {
    const { data: opts, error: oe } = await supabase
      .from("options").select("*").eq("question_id", q.question_id);
    if (oe || !opts) throw new Error(`Options not found for question ${q.question_id}`);
    questionsWithOptions.push({ ...q, options: opts });
  }

  return {
    quiz: quiz as Quiz,
    instructor: user.username,
    subject: subj.subject_name,
    questions: questionsWithOptions
  };
}

/** Utility: detect Arabic characters */
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Get appropriate option labels based on language
 */
function getOptionLabels(isArabic: boolean): string[] {
  // Arabic alphabet options: أ, ب, ج, د, هـ, و, ز, ح
  return isArabic 
    ? ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"]
    : ["A", "B", "C", "D", "E", "F", "G", "H"];
}

/**
 * Check if exam is primarily in Arabic
 */
function isArabicExam(examData: ExamData): boolean {
  // Count Arabic content elements
  let arabicContentCount = 0;
  let totalContentElements = 0;
  
  // Check subject and instructor
  if (containsArabic(examData.subject)) arabicContentCount++;
  if (containsArabic(examData.instructor)) arabicContentCount++;
  totalContentElements += 2;
  
  // Check questions
  for (const q of examData.questions) {
    if (containsArabic(q.question_text)) arabicContentCount++;
    totalContentElements++;
    
    // Check options
    for (const o of q.options) {
      if (containsArabic(o.option_text)) arabicContentCount++;
      totalContentElements++;
    }
  }
  
  // If over 40% of content contains Arabic, consider it an Arabic exam
  return (arabicContentCount / totalContentElements) > 0.4;
}

/**
 * Generates a DOCX exam paper with correct RTL/LTR alignment
 */
async function generateDocx(examData: ExamData): Promise<Uint8Array> {
  const paragraphs: Paragraph[] = [];
  
  // Determine if this is primarily an Arabic exam
  const isArabic = isArabicExam(examData);
  
  const subjectArabic = containsArabic(examData.subject);
  const instructorArabic = containsArabic(examData.instructor);

  // Header
  paragraphs.push(new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: `Subject: ${examData.subject}`, bold: true }),
      new TextRun({ text: `\tInstructor: ${examData.instructor} | Duration: ${examData.quiz.duration} minutes` })
    ],
    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 400 },
    bidirectional: subjectArabic || instructorArabic,
    alignment: AlignmentType.LEFT  // Keep header alignment consistent
  }));

  // Questions & Options
  for (let i = 0; i < examData.questions.length; i++) {
    const q = examData.questions[i];
    const qArabic = containsArabic(q.question_text);
    const optionLabels = getOptionLabels(qArabic || isArabic);

    // Question
    paragraphs.push(new Paragraph({
      children: [ new TextRun({ text: `${i+1}. ${q.question_text}`, bold: true }) ],
      spacing: { after: 200 },
      bidirectional: qArabic,
      alignment: qArabic ? AlignmentType.RIGHT : AlignmentType.LEFT
    }));

    // Options
    for (let j = 0; j < q.options.length; j++) {
      const o = q.options[j];
      const oArabic = containsArabic(o.option_text);
      
      paragraphs.push(new Paragraph({
        children: [ new TextRun({ text: `${optionLabels[j]}. ${o.option_text}` }) ],
        indent: { left: 720 },
        spacing: { after: 120 },
        bidirectional: oArabic || qArabic,
        alignment: oArabic || qArabic ? AlignmentType.RIGHT : AlignmentType.LEFT
      }));
    }

    // Spacer
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Build & serialize
  const doc = new Document({ 
    sections: [{ 
      children: paragraphs,
      properties: {
        // Set document RTL if it's an Arabic exam
        bidi: isArabic
      }
    }] 
  });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
