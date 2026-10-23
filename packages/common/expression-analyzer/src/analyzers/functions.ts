import type { SyntaxNode } from '@lezer/common';

import type { InvokedFunction } from '../types';

import {
  collectFunctionParameters,
  collectIterationVariables,
  forEachChild,
  isInScope,
  nodeText,
  withScope,
} from './utils';

const ITERATION_KEYWORDS = new Set([ 'for', 'return', 'some', 'every', 'InExpressions', 'satisfies' ]);

export function analyzeForFunctions(
    node: SyntaxNode,
    source: string,
    builtinNames: Set<string>,
): InvokedFunction[] {
  const functions: InvokedFunction[] = [];
  const scopes: Set<string>[] = [];

  const recordInvocation = (funcNameNode: SyntaxNode) => {
    const name = nodeText(funcNameNode, source);
    const type: InvokedFunction['type'] =
      !isInScope(name, scopes) && builtinNames.has(name) ? 'builtin' : 'user';

    const { from, to } = funcNameNode;
    functions.push({ name, type, from, to });
  };

  const walk = (n: SyntaxNode) => {
    const { name: nodeName } = n;

    if (nodeName === 'Context') {
      withScope(scopes, [], (scope) => {
        forEachChild(n, (child) => {
          if (child.name !== 'ContextEntry') return;

          forEachChild(child, (entryChild) => {
            if (entryChild.name !== 'Key') walk(entryChild);
          });

          const keyName = child.getChild('Key')?.getChild('Name');
          if (keyName) scope.add(nodeText(keyName, source));
        });
      });
      return;
    }

    if (nodeName === 'FunctionDefinition') {
      const params = collectFunctionParameters(n, source);
      withScope(scopes, params, () => {
        const body = n.getChild('FunctionBody');
        if (body) walk(body);
      });
      return;
    }

    if (nodeName === 'ForExpression' || nodeName === 'QuantifiedExpression') {
      const inExp = n.getChild('InExpressions');
      if (inExp) {
        forEachChild(inExp, (child) => {
          if (child.name === 'InExpression') {
            forEachChild(child, (innerChild) => {
              if (innerChild.name !== 'Name' && innerChild.name !== 'in' && innerChild.name !== 'Identifier') {
                walk(innerChild);
              }
            });
          }
        });
      }

      withScope(scopes, collectIterationVariables(n, source), () => {
        forEachChild(n, (child) => {
          if (!ITERATION_KEYWORDS.has(child.name)) walk(child);
        });
      });
      return;
    }

    if (nodeName === 'FunctionInvocation') {
      const funcNameNode = n.getChild('VariableName');
      if (funcNameNode) recordInvocation(funcNameNode);
    }

    forEachChild(n, walk);
  };

  walk(node);

  return functions.sort((a, b) => a.from - b.from);
}
