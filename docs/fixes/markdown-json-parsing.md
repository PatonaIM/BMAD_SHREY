# Resume Extraction Markdown Handling Fix

## Issue

The AI extraction service was failing when OpenAI returned JSON wrapped in markdown code blocks:

````
"event":"ai_extraction_parse_error"
"content":"```json\n{\n  \"summary\": \"Professional with...\",\n  \"skills\": [\n..."
"error":"Unexpected token '`', \"```json\n{\n\"... is not valid JSON"
````

## Root Cause

OpenAI's GPT models sometimes return JSON responses wrapped in markdown code blocks (``json ... `) even when instructed to return pure JSON. The `JSON.parse()` call was failing because it couldn't parse the markdown syntax.

## Solution

Added a `stripMarkdownCodeBlocks()` helper method to clean AI responses before parsing:

````typescript
private stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content.trim();

  // Remove ```json\n ... \n``` blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  // Remove ``` ... ``` blocks
  else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return cleaned.trim();
}
````

## Changes Made

### 1. Enhanced System Prompt

```typescript
{
  role: 'system',
  content: 'You are a professional resume parser. Extract structured information from resumes and return ONLY valid JSON without any markdown formatting, code blocks, or additional text.',
}
```

### 2. Improved User Prompt

```typescript
IMPORTANT: Return ONLY the JSON object. Do NOT wrap it in markdown code blocks or backticks. Do NOT include any text before or after the JSON.
```

### 3. Markdown Stripping in Parse Logic

```typescript
try {
  // Strip markdown code blocks if present
  const cleanedContent = this.stripMarkdownCodeBlocks(content);
  const parsed = JSON.parse(cleanedContent);
  return this.validateAndNormalizeExtraction(parsed);
} catch (error) {
  logger.error({
    event: 'ai_extraction_parse_error',
    content: content.slice(0, 500),
    error: (error as Error).message,
  });
  throw new Error('Failed to parse AI response as JSON');
}
```

## Supported Formats

The fix now handles:

1. **Plain JSON**: `{"key": "value"}`
2. **JSON code block**: `json\n{"key": "value"}\n`
3. **Generic code block**: `\n{"key": "value"}\n`
4. **Whitespace variations**: Extra spaces and newlines around markers

## Testing

To test the fix, try creating a profile with a resume that previously failed:

```bash
curl -X POST http://localhost:3000/api/profile/create-from-resume \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"forceRegenerate": true}'
```

Expected result: Profile extraction should succeed even if OpenAI returns markdown-wrapped JSON.

## Impact

- ✅ **Backward Compatible**: Still handles plain JSON responses
- ✅ **Robust**: Handles all common markdown formatting variations
- ✅ **Logged**: Errors still logged with content preview for debugging
- ✅ **No Breaking Changes**: Existing functionality unchanged

## Related Files

- `/src/services/ai/resumeExtraction.ts` - Core extraction service
- `/src/app/api/profile/create-from-resume/route.ts` - Profile creation endpoint
- `/docs/api/profile-creation.md` - API documentation
