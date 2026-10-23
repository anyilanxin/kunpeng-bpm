import { domify } from 'min-dom';
import { kunpengBuiltins } from '@kunpeng-io/expression-builtins';

export const domifiedBuiltins = kunpengBuiltins.map(builtin => ({
  ...builtin,
  info: () => domify(builtin.info),
}));
