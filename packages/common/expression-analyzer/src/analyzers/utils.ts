import type { SyntaxNode } from '@lezer/common';

import type { InputVariable } from '../types';

/**
 * Strip backticks from identifier names
 */
export function stripBackticks(text: string): string {
  return text.replace(/^`|`$/g, '');
}

/**
 * Read the source text of a node, stripping backticks
 */
export function nodeText(node: SyntaxNode, source: string): string {
  return stripBackticks(source.substring(node.from, node.to));
}

// --- Scope helpers ---

/**
 * Check if a variable is defined in any active scope
 */
export function isInScope(varName: string, scopes: Set<string>[]): boolean {
  return scopes.some((scope) => scope.has(varName));
}

/**
 * Execute `fn` with a new scope pushed onto the scope stack,
 * then pop it automatically. Returns the created scope so callers
 * can add names to it during processing.
 */
export function withScope<T>(
    scopes: Set<string>[],
    initialNames: Iterable<string>,
    fn: (scope: Set<string>) => T,
): T {
  const scope = new Set<string>(initialNames);
  scopes.push(scope);
  const result = fn(scope);
  scopes.pop();
  return result;
}

// --- AST traversal helpers ---

/**
 * Iterate over direct children of a node
 */
export function forEachChild(node: SyntaxNode, callback: (child: SyntaxNode) => void): void {
  let child = node.firstChild;
  while (child) {
    callback(child);
    child = child.nextSibling;
  }
}

/**
 * Collect path parts from a PathExpression node (e.g. `a.b.c` → ['a', 'b', 'c'])
 */
export function collectPathParts(node: SyntaxNode, source: string): string[] {
  const parts: string[] = [];
  forEachChild(node, (child) => {
    if (child.name === 'PathExpression') {
      parts.push(...collectPathParts(child, source));
    } else if (child.name === 'VariableName' || child.name === 'PathName') {
      parts.push(nodeText(child, source));
    }
  });
  return parts;
}

/**
 * Check if a PathExpression node has a Context as its base
 */
export function hasContextBase(node: SyntaxNode): boolean {
  const firstChild = node.firstChild;
  if (!firstChild) return false;
  if (firstChild.name === 'Context') return true;
  if (firstChild.name === 'PathExpression') return hasContextBase(firstChild);
  return false;
}

/**
 * Extract key names from a Context node
 */
export function extractContextKeys(contextNode: SyntaxNode, source: string): string[] {
  const keys: string[] = [];
  forEachChild(contextNode, (child) => {
    if (child.name === 'ContextEntry') {
      const keyName = child.getChild('Key')?.getChild('Name');
      if (keyName) {
        keys.push(nodeText(keyName, source));
      }
    }
  });
  return keys;
}

/**
 * Collect iteration variable names from a ForExpression or QuantifiedExpression
 */
export function collectIterationVariables(node: SyntaxNode, source: string): string[] {
  const vars: string[] = [];
  const inExpressions = node.getChild('InExpressions');
  if (inExpressions) {
    forEachChild(inExpressions, (child) => {
      if (child.name === 'InExpression') {
        const id = child.getChild('Name')?.getChild('Identifier');
        if (id) vars.push(source.substring(id.from, id.to));
      }
    });
  }
  return vars;
}

/**
 * Collect formal parameter names from a FunctionDefinition
 */
export function collectFunctionParameters(node: SyntaxNode, source: string): string[] {
  const params: string[] = [];
  const formalParams = node.getChild('FormalParameters');
  if (formalParams) {
    forEachChild(formalParams, (child) => {
      if (child.name === 'FormalParameter') {
        const id = child.getChild('ParameterName')?.getChild('Name')?.getChild('Identifier');
        if (id) params.push(source.substring(id.from, id.to));
      }
    });
  }
  return params;
}

/**
 * Find a variable by name in an InputVariable array
 */
export function findVariable(variables: InputVariable[], name: string): InputVariable | undefined {
  return variables.find((v) => v.name === name);
}

/**
 * Find a variable by name, or create and insert it if missing
 */
export function findOrCreateVariable(variables: InputVariable[], name: string): InputVariable {
  let variable = findVariable(variables, name);
  if (!variable) {
    variable = { name };
    variables.push(variable);
  }
  return variable;
}

/**
 * Build nested context entries from a dot path (e.g. ['a', 'b', 'c']).
 * Creates intermediate context nodes as needed.
 */
export function buildNestedEntries(
    variables: InputVariable[],
    pathParts: string[],
): void {
  const rootVar = findOrCreateVariable(variables, pathParts[0]);

  if (pathParts.length <= 1) return;

  if (!rootVar.type) {
    rootVar.type = 'Context';
    rootVar.entries = rootVar.entries || [];
  }
  if (rootVar.type !== 'Context') return;

  let currentLevel = rootVar.entries!;
  for (let i = 1; i < pathParts.length; i++) {
    const part = pathParts[i];
    const isLast = i === pathParts.length - 1;

    let entry = findVariable(currentLevel, part);
    if (!entry) {
      entry = isLast
        ? { name: part }
        : { name: part, type: 'Context', entries: [] };
      currentLevel.push(entry);
    } else if (!isLast && !entry.type) {
      entry.type = 'Context';
      entry.entries = entry.entries || [];
    }

    if (!isLast) {
      entry.entries = entry.entries || [];
      currentLevel = entry.entries;
    }
  }
}

/**
 * Sort entries recursively for deterministic output
 */
export function sortEntries(variable: InputVariable): void {
  if (variable.entries) {
    variable.entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of variable.entries) {
      sortEntries(entry);
    }
  }
}