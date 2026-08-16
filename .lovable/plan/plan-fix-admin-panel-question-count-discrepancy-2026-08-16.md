# Plan: Fix Admin Panel Question Count Discrepancy

The user is reporting that the admin panel incorrectly shows "4" or "5" questions for exams that students see as having many more (e.g., 25 or 45). This is likely due to a data synchronization issue between the cached `question_count` field in the `exams` table and the actual number of rows in the `questions` table (or the `questions` JSON if it's being used that way).

## User Review Required

> [!IMPORTANT]
> This fix will force the admin panel to calculate the question count directly from the database for the most accurate results.

- Do you want to keep the "Sets" feature exactly as it is (splitting questions into Set A, Set B, etc.)?

## Proposed Changes

### Backend/API

#### [api.ts](src/lib/api.ts)
- Update `dbExamToApp` to ensure `questionCount` is derived from the provided `questions` array if available.
- In `upsertExam`, add a safety check to ensure `questionCount` is recalculated based on the actual number of questions being saved to the database.

### Frontend Admin Panel

#### [AdminExams.tsx](src/pages/admin/AdminExams.tsx)
- Modify the exam list display to strictly prioritize `e.questions.length` over any cached `questionCount` field.
- Ensure that when an exam is loaded for editing, it fetches the latest questions from the backend to avoid stale data.

#### [QuestionEditor.tsx](src/components/QuestionEditor.tsx)
- Add a cleanup step on save to ensure the `questionCount` property of the `Exam` object is perfectly synced with the `questions` array before the API call.

#### [AdminCSVUpload.tsx](src/pages/admin/AdminCSVUpload.tsx)
- Audit the "Split into Sets" logic to ensure that every individual set created has its `questionCount` explicitly set to the chunk size.

## Technical Details

- The `exams` table in Supabase has a `question_count` integer column.
- The `questions` are stored in a separate `questions` table linked by `exam_id`.
- I will ensure `upsertExam` explicitly sends `question_count: questions.length` to the `exams` table.
- I will verify if there's any trigger or RLS policy that might be interfering with the `question_count` update.

## Verification Plan

### Manual Verification
1. Upload a CSV with 25 questions and split it into sets of 5.
2. Verify that each set shows "5 প্রশ্ন" in the admin list.
3. Open one set in the editor and verify 5 questions appear.
4. Add a question in the editor, save, and verify the count updates to 6 in the list.
5. Check student view to ensure it matches the admin view.
