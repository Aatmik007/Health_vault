/**
 * Sanitizes and cleans extracted text
 * - Removes excessive blank lines
 * - Collapses repeated whitespace
 * - Removes non-printable control characters
 * - Trims lines
 */
export const cleanText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Replace non-printable control characters (except tab and newlines)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize Windows/Mac line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Trim spaces on each line
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    // Collapse 3 or more consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
