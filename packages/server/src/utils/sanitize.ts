export function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return text ?? null;

  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT_REMOVED]')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="[REMOVED]"')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateText(text: string | null | undefined, maxLength: number = 500): string | null {
  if (!text) return text ?? null;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}
