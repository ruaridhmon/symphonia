/** Keep proxy error pages out of the consultation UI. */
export function draftError(error: unknown): string {
 const message=error instanceof Error?error.message:String(error||'Draft generation failed.');
 if (/<(?:!doctype|html|head|body|style)\b/i.test(message)) {
  return 'The server could not complete the draft request. Your previous draft is safe. Please try again.';
 }
 try {const parsed=JSON.parse(message);if(typeof parsed.detail==='string')return parsed.detail;} catch { /* Plain model errors already contain useful text. */ }
 return message;
}
