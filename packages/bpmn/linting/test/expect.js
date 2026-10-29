var chai = require('chai');
var sinon = require('sinon');
var sinonChaiModule = require('sinon-chai');

// sinon-chai may be an ES module; unwrap default export if needed.
var sinonChai = sinonChaiModule.default || sinonChaiModule;

// expose chai + sinon matchers as globals, matching the former
// karma-sinon-chai framework behavior.
chai.use(sinonChai);

global.expect = chai.expect;
global.sinon = sinon;
