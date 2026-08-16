# Plan - Fix Question Count Discrepancy and Enhance Admin Question Editor

The user is reporting that while students see the correct question count, the admin panel shows a different count (often 4) when editing. I will fix the data flow in the admin panel to ensure the correct number of questions is always loaded, displayed, and editable. I will also improve the visibility of the correct answer in the editor.

## Proposed Changes

### 1. Data Integrity & Display Fixes
- **Admin Exam List (`src/pages/admin/AdminExams.tsx`)**:
    - Update the exam list to calculate question count directly from the `questions` array instead of relying on the `question_count` column, which might be out of sync.
- **API Logic (`src/lib/api.ts`)**:
    - Ensure `upsertExam` correctly updates both the `questions` table and the `exams.question_count` column.
    - Double-check `fetchExams` to ensure it correctly populates the `questions` property for each exam.

### 2. Admin Question Editor Enhancements
- **Editor UI (`src/components/QuestionEditor.tsx`)**:
    - Fix the initialization logic to ensure all questions are correctly loaded into state when the editor opens.
    - Enhance the visual feedback for the "Correct Answer":
        - Add a distinctive border or background color to the selected option.
        - Add a "Correct Answer" badge/label to the selected option.
        - Ensure the `answer` string exactly matches one of the `options` for the checkmark to appear.

### 3. Question Reports Improvement
- **Admin Reports (`src/pages/admin/AdminQuestionReports.tsx`)**:
    - Add a "copy to clipboard" button for the exam name in the report list, as requested, to facilitate quick searching.

## Technical Details
- Use the length of the `questions` array as the source of truth for counts.
- Use Tailwind classes for the "Correct Answer" highlighting in `QuestionEditor.tsx`.
- Implement a simple `navigator.clipboard.writeText` utility for the copy feature.

## Verification Plan
- **Manual Verification**:
    1. Navigate to the Admin Panel -> Exams.
    2. Verify the question count displayed in the list matches the actual count.
    3. Click "Edit Questions" and verify all questions are present.
    4. Change an answer and verify the UI clearly highlights the new selection.
    5. Save and verify the count remains correct in the list.
    6. Go to Question Reports and test the one-click copy feature.
