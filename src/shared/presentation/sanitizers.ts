// Clean raw request values before zod checks their type. Non-string values pass through unchanged.

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Trim; an empty string becomes null. */
export function blankToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
}

/** Trim, escape HTML characters (XSS), and turn an empty string into null. */
export function sanitizeText(value: unknown): unknown {
  const trimmed = blankToNull(value);
  return typeof trimmed === 'string' ? escapeHtml(trimmed) : trimmed;
}

/** "male" -> "MALE"; an empty string becomes null. */
export function upperCaseOrNull(value: unknown): unknown {
  const trimmed = blankToNull(value);
  return typeof trimmed === 'string' ? trimmed.toUpperCase() : trimmed;
}
