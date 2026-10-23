import standaloneCode from 'ajv/dist/standalone/index.js';
import { writeFileSync as writeFile, mkdirSync as mkdir } from 'fs';
import { resolve, dirname } from 'path';

import validateKunpeng, { ajv as zeebeAjv } from '../src/validateKunpeng.js';


export function createStandaloneKunpengValidator() {
  const code = standaloneCode(zeebeAjv, validateKunpeng);
  const filePath = resolve('tmp', 'standaloneKunpengValidator.js');

  try {
    mkdir(dirname(filePath));
  } catch (err) {

    // ignore; directory may already exist
  }

  // ajv standalone 产出为 CJS；追加同名 ESM 导出，别名目标才能被当作混合模块解析
  const m = /module\.exports = (\w+);/.exec(code);
  writeFile(filePath, m ? code + "\nexport default " + m[1] + ";\n" : code);

  return filePath;
}
