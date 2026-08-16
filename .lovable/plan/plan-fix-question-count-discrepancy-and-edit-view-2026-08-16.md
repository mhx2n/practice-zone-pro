# Plan - Fix Question Count Discrepancy and Edit View

The user is reporting that even after uploading a CSV with many questions (e.g., 136 questions) and splitting them into sets, both the admin panel and the student exam view correctly show the count (e.g., 45 questions), but when clicking "Edit" in the admin panel, only a small number of questions (e.g., 4 or 5) are shown.

## Diagnosis
1.  **Student View/Admin List**: These views likely fetch exams and their associated questions using `fetchExams` from `src/lib/api.ts`, which joins the `questions` table.
2.  **Question Editor**: The `QuestionEditor` component (in `src/components/QuestionEditor.tsx`) initializes its state using `exam.questions`.
3.  **Data Mismatch**: The discrepancy suggests that the `exam` object being passed to the `QuestionEditor` does not have the full array of questions, or the way it's being parsed/initialized in the editor is flawed.
4.  **Local State vs. Database**: Since the student view shows the correct count, the database *has* the questions. The issue is likely how the `exams` data is managed in the frontend store or passed between components.

## Proposed Changes

### 1. API and Data Handling (`src/lib/api.ts`)
- Ensure `fetchExams` and `fetchExamById` always populate the `questions` array correctly from the `questions` table.
- Verify `upsertExam` correctly handles the deletion and re-insertion of questions to maintain a clean state.

### 2. Admin Exams List (`src/pages/admin/AdminExams.tsx`)
- Ensure the `editingExam` state is set with the *full* exam object, including all questions fetched from the database.
- Verify that the `exams` data fetched by the `useExams` hook (which calls `fetchExams`) actually includes the questions.

### 3. Question Editor (`src/components/QuestionEditor.tsx`)
- Audit the initialization of the `questions` state. It currently handles both array and stringified JSON, which might be causing issues if the data format is inconsistent.
- Ensure that if `exam.questions` is empty but `exam.questionCount > 0`, it prompts a re-fetch or handles the missing data gracefully (though `fetchExams` should have already populated it).

### 4. CSV Upload Logic (`src/pages/admin/AdminCSVUpload.tsx`)
- Verify that when `upsertExam.mutateAsync` is called for each set, the `questions` array is correctly passed and that the backend successfully saves all of them.

## Technical Details
- The project uses a custom `store` (in `src/lib/store.ts`) for caching. If the store's `exams` list only contains partial data (e.g., from an earlier fetch that didn't include questions), the editor might be using stale or incomplete cached data.
- I will modify `src/lib/api.ts` to be more defensive about ensuring `questions` are loaded and correctly counted.
- I will update `QuestionEditor.tsx` to ensure it always uses the most up-to-date question list.

## Verification Plan
- **CSV Upload Test**: Simulate a CSV upload with many questions and check if the sets created have the correct number of questions in the editor.
- **Manual Edit Test**: Open the editor for an existing exam that shows a high question count in the list and verify all questions appear in the editor.
