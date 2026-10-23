import type { SyntaxNode } from '@lezer/common';

/**
 * Walk the AST and return true if any node is a parser error node.
 * Short-circuits on the first error found.
 */
export function analyzeForValidity(node: SyntaxNode): boolean {
  return !containsErrorNodes(node);
}

function containsErrorNodes(node: SyntaxNode): boolean {
  if (node.type.isError) {
    return true;
  }

  let child = node.firstChild;

  while (child) {
    if (containsErrorNodes(child)) {
      return true;
    }

    child = child.nextSibling;
  }

  return false;
}
