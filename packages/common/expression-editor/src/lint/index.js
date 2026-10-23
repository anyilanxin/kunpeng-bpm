import { cmQlexpressionLinter } from '@kunpeng-io/expression-lint';
import { linter } from '@codemirror/lint';

export default [ linter(cmQlexpressionLinter()) ];
