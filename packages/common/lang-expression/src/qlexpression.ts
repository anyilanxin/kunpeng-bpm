import {
  parser,
  trackVariables
} from '@kunpeng-io/lezer-expression';

import {
  LRLanguage,
  LanguageSupport,
  delimitedIndent,
  continuedIndent,
  indentNodeProp,
  foldNodeProp,
  foldInside
} from '@codemirror/language';

import {
  snippets
} from './snippets.js';

import {
  keywordCompletions,
  snippetCompletion
} from './completion.js';

import {
  CompletionSource
} from '@codemirror/autocomplete';


/**
 * A FEEL language provider based on the
 * [Lezer FEEL parser](https://github.com/nikku/lezer-feel),
 * extended with highlighting and indentation information.
 */
export const qlexpressionLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        'Context': delimitedIndent({
          closing: '}'
        }),
        'List FilterExpression': delimitedIndent({
          closing: ']'
        }),
        'ParenthesizedExpression FunctionInvocation': continuedIndent({
          except: /^\s*\)/
        }),
        'ForExpression QuantifiedExpression IfExpression': continuedIndent({
          except: /^\s*(then|else|return|satisfies)\b/
        }),
        'FunctionDefinition': continuedIndent({
          except: /^\s*(\(|\))/
        })
      }),
      foldNodeProp.add({
        Context: foldInside,
        List: foldInside,
        ParenthesizedExpression: foldInside,
        FunctionDefinition(node) {
          const last = node.getChild(')');

          if (!last) return null;

          return {
            from: last.to,
            to: node.to
          };
        }
      })
    ]
  }),
  languageData: {
    indentOnInput: /^\s*(\)|\}|\]|then|else|return|satisfies)$/,
    commentTokens: {
      line: '//',
      block: {
        open: '/*',
        close: '*/'
      }
    }
  }
});

export type QlexpressionConfig = {
  dialect?: 'expression' | 'unaryTests',
  parserDialect?: string,
  completions?: CompletionSource[],
  context?: Record<string, unknown>
};

/**
 * A language provider for FEEL Unary Tests
 */
export const unaryTestsLanguage = qlexpressionLanguage.configure({
  top: 'UnaryTests',
}, 'Ql unary tests');

/**
 * Language provider for FEEL Expression
 */
export const expressionLanguage = qlexpressionLanguage.configure({
  top: 'Expression'
}, 'Ql expression');



/**
 * Qlexpression language support for CodeMirror.
 *
 * Includes [snippet](#lang-expression.snippets)
 */
export function qlexpression(config: QlexpressionConfig = {}) {
  const language = config.dialect === 'unaryTests' ? unaryTestsLanguage : expressionLanguage;

  const dialect = config.parserDialect;
  const contextTracker = trackVariables(config.context);

  const contextualLang = language.configure({
    contextTracker,
    dialect
  });

  const completions = config.completions || [
    snippetCompletion(snippets),
    keywordCompletions,
  ].flat();

  return new LanguageSupport(contextualLang, [
    ...(
      completions.map(autocomplete => contextualLang.data.of({
        autocomplete
      }))
    )
  ]);

}
