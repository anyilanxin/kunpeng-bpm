import Linting from './Linting.js';
import LintingAnnotations from './LintingAnnotations.js';

export default {
  __init__: [
    'linting',
    'lintingAnnotations'
  ],
  linting: [ 'type', Linting ],
  lintingAnnotations: [ 'type', LintingAnnotations ]
};