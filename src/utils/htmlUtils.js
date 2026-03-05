/**
 * Validates and fixes incomplete HTML by ensuring proper closing tags
 */
export function validateAndFixHTML(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  let cleaned = html.trim();

  // Remove any markdown code blocks if present (handle multiple formats)
  cleaned = cleaned.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
  cleaned = cleaned.replace(/^`/g, '').replace(/`$/g, ''); // Remove single backticks
  cleaned = cleaned.trim();

  // Check if it starts with <!DOCTYPE or <html
  const hasDoctype = /^\s*<!DOCTYPE/i.test(cleaned);
  const hasHtmlTag = /<html/i.test(cleaned);

  // If it doesn't have proper HTML structure, try to fix it
  if (!hasDoctype && !hasHtmlTag) {
    // Check if it's just HTML fragments
    if (cleaned.startsWith('<')) {
      // Wrap in basic HTML structure
      cleaned = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
${cleaned}
</body>
</html>`;
    } else {
      return null;
    }
  }

  // Ensure proper closing tags - check for incomplete HTML structure
  const hasBodyTag = /<body[^>]*>/i.test(cleaned);
  const hasClosingBodyTag = /<\/body>/i.test(cleaned);
  const hasClosingHtmlTag = /<\/html>/i.test(cleaned);
  
  // If we have opening tags but missing closing tags, add them
  if (hasHtmlTag) {
    // Add closing body tag if body is open but not closed
    if (hasBodyTag && !hasClosingBodyTag) {
      cleaned += '\n</body>';
    }
    
    // Add closing html tag if html is open but not closed
    if (!hasClosingHtmlTag) {
      cleaned += '\n</html>';
    }
  }
  
  // If we have DOCTYPE but no html structure, wrap it
  if (hasDoctype && !hasHtmlTag) {
    // Try to find where the actual content starts
    const doctypeEnd = cleaned.indexOf('>');
    if (doctypeEnd !== -1) {
      const afterDoctype = cleaned.substring(doctypeEnd + 1).trim();
      cleaned = cleaned.substring(0, doctypeEnd + 1) + '\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n' + afterDoctype + '\n</body>\n</html>';
    }
  }

  // Check for common unclosed tags and close them
  const openTags = [];
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match;
  const tagStack = [];

  while ((match = tagRegex.exec(cleaned)) !== null) {
    const tagName = match[1].toLowerCase();
    const isClosing = match[0].startsWith('</');
    
    if (!isClosing) {
      // Self-closing tags
      if (!['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'].includes(tagName)) {
        tagStack.push(tagName);
      }
    } else {
      // Remove from stack
      const index = tagStack.lastIndexOf(tagName);
      if (index !== -1) {
        tagStack.splice(index, 1);
      }
    }
  }

  // Close any remaining open tags (in reverse order)
  let fixedHTML = cleaned;
  for (let i = tagStack.length - 1; i >= 0; i--) {
    fixedHTML += `</${tagStack[i]}>`;
  }

  return fixedHTML;
}

/**
 * Extracts the most complete HTML block from content
 */
export function extractCompleteHTML(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // First, try to find complete HTML documents
  const htmlDocRegex = /<!DOCTYPE\s+html[\s\S]*?<\/html>/gi;
  let matches = content.match(htmlDocRegex);
  
  if (matches && matches.length > 0) {
    // Return the last (most recent) complete HTML document
    const lastMatch = matches[matches.length - 1];
    return validateAndFixHTML(lastMatch);
  }

  // Try to find HTML blocks with <html> tags
  const htmlTagRegex = /<html[\s\S]*?<\/html>/gi;
  matches = content.match(htmlTagRegex);
  
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return validateAndFixHTML(lastMatch);
  }

  // Check for incomplete HTML (starts with HTML but missing closing tags)
  // This handles cases where the response was cut off
  const incompleteHtmlRegex = /<html[\s\S]*$/i;
  const incompleteMatch = content.match(incompleteHtmlRegex);
  if (incompleteMatch) {
    // Try to fix incomplete HTML
    return validateAndFixHTML(incompleteMatch[0]);
  }

  // Check for DOCTYPE without closing html tag (incomplete)
  const incompleteDoctypeRegex = /<!DOCTYPE\s+html[\s\S]*$/i;
  const incompleteDoctypeMatch = content.match(incompleteDoctypeRegex);
  if (incompleteDoctypeMatch) {
    return validateAndFixHTML(incompleteDoctypeMatch[0]);
  }

  // Check if the entire content is HTML-like
  const trimmed = content.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || 
      (trimmed.startsWith('<') && trimmed.includes('</'))) {
    return validateAndFixHTML(trimmed);
  }

  // Try to find any HTML-like content at the end (might be incomplete)
  const htmlLikeRegex = /<[a-z][\s\S]*$/i;
  const htmlLikeMatch = content.match(htmlLikeRegex);
  if (htmlLikeMatch && htmlLikeMatch[0].length > 50) { // Only if substantial content
    return validateAndFixHTML(htmlLikeMatch[0]);
  }

  return null;
}
