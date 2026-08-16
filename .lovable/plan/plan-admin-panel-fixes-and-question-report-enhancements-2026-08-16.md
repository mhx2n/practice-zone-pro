# Plan - Admin Panel Fixes and Question Report Enhancements

The user is experiencing several issues in the Admin Panel:
1. **Search Discrepancy:** Searching for an exam shows a question count (e.g., 33) but the editor only shows a few questions (e.g., 4). This suggests a mismatch between the `questionCount` field and the actual `questions` array in the JSONB field.
2. **Correct Answer Visibility:** In the question editor, it's difficult to see which option is currently selected as the correct answer when editing.
3. **Report System Enhancement:** In the question report section, the exam name should be easily copyable with a single click to facilitate quick searching.

## Proposed Changes

### 1. Fix Question Count Mismatch
- I will investigate `src/pages/admin/AdminExams.tsx` and `src/components/QuestionEditor.tsx`.
- The `questionCount` field in the database might not be staying in sync with the actual length of the `questions` JSONB array. 
- I will ensure that when an exam is upserted, the `questionCount` is derived from `questions.length`.
- I will also add a safeguard in the admin list to display the actual length of the questions array if it differs from the cached `questionCount`.

### 2. Improve Correct Answer UI in Editor
- In `src/components/QuestionEditor.tsx`, I will enhance the visual indicator for the correct answer.
- I'll add a checkmark icon or a more distinct background/border to the selected option.
- I'll ensure that the "Correct" button is clearly highlighted.

### 3. One-Click Copy for Exam Names in Reports
- In `src/pages/admin/AdminQuestionReports.tsx`, I will wrap the exam title in a component that allows one-click copying to the clipboard.
- I'll add a visual feedback (like a tooltip or temporary icon change) when the text is copied.

### 4. Fix "Search" Positioning (Addressing previous user request context)
- Ensure search results in the admin panel flow correctly as per the user's previous preference (inline below search box, not overlay).

## Technical Details

### Database Sync
- Verify `useUpsertExam` hook and ensure it sends the correct `questionCount`.

### UI Components
- Add `Copy` icon from `lucide-react` to the report titles.
- Use `navigator.clipboard.writeText` for the copy functionality.

### Question Editor
- Update the styles in the `options.map` loop to make the `answer === opt` state much more prominent.
- The user mentioned "ekhane shothik answer konta select kora ta dekha jayna" (here it can't be seen which correct answer is selected). I will add a prominent badge or color change.

## Verification Plan

### Manual Verification
- Go to Admin > Exams, search for an exam, and check if the question count in the list matches the number of questions in the editor.
- Open the question editor, change the correct answer, and verify it's visually distinct.
- Go to Admin > Question Reports, click on an exam name, and verify it copies to the clipboard.
- Paste the copied name into the exam search to verify it works as intended.
