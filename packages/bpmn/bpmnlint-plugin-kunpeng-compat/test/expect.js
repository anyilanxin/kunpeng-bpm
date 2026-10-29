var chaiModule = require('chai');
var sinon = require('sinon');
var sinonChaiModule = require('sinon-chai');

// chai / sinon-chai ship as ES modules; under vitest's CJS interop a bare
// require may yield a namespace object, so unwrap the default export.
var chai = chaiModule.default || chaiModule;
var sinonChai = sinonChaiModule.default || sinonChaiModule;

// expose chai + sinon matchers as globals, matching the former
// mocha + karma-sinon-chai framework behavior.
chai.use(sinonChai);

global.expect = chai.expect;
global.sinon = sinon;
