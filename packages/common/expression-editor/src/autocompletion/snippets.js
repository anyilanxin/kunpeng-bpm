import { snippets, snippetCompletion } from '@kunpeng-io/lang-expression';

/**
 * A completion source for snippets, including:
 *
 *   * Structural snippets (for, if, function, …)
 *   * Literal keywords (true, false, null)
 *
 * @return {import('@codemirror/autocomplete').CompletionSource}
 */
export function snippetCompletions() {
  return snippetCompletion(snippets);
}
