# Plan - Fix Question Count Discrepancy

Investigate and fix the issue where exams show a different question count in the admin list compared to the actual questions available in the editor.

## Proposed Changes

### Admin Panel
- **Fix Data Sync in AdminExams.tsx**: Ensure the question count displayed in the list always matches the `questions` array length.
- **Audit CSV Import Logic**: Verify `AdminCSVUpload.tsx` correctly handles question count when splitting into sets.
- **Audit Question Editor**: Ensure `QuestionEditor.tsx` correctly loads all questions from the exam object.

### Database / API (if needed)
- Ensure `upsertExam` correctly calculates and saves the `question_count` column based on the array length.

## Technical Details
- In `AdminExams.tsx`, the display `(e.questions || []).length` should be reliable, but the backend `question_count` column might be out of sync.
- I will verify the `upsertExam` implementation in `src/lib/api.ts` to ensure it updates the count column.
- I will check if any pagination or local filtering is hiding questions in the editor.
