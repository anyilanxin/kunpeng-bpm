import {
  createContext
} from 'preact';

/**
 * @typedef { {
 *   parserDialect?: import('@kunpeng-io/expression-editor').ParserDialect,
 *   builtins?: import('@kunpeng-io/expression-editor').Variable[],
 *   dialect?: import('@kunpeng-io/expression-editor').Dialect
 * } } FeelLanguageContextType
 */

/**
 * @type {import('preact').Context<FeelLanguageContextType>}
 */
const FeelLanguageContext = createContext({});

export default FeelLanguageContext;
