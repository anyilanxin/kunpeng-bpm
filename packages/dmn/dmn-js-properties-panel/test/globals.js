import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

// expose chai + sinon matchers as globals, matching the former
// karma-sinon-chai framework behavior.
chai.use(sinonChai);

// register custom jsonEqual assertion (previously set up via global.chai.use
// in TestHelper.js).
chai.use(function(_chai, utils) {
  utils.addMethod(chai.Assertion.prototype, 'jsonEqual', function(comparison) {
    var actual = JSON.stringify(this._obj);
    var expected = JSON.stringify(comparison);

    this.assert(
      actual == expected,
      'expected #{this} to deep equal #{act}',
      'expected #{this} not to deep equal #{act}',
      comparison, // expected
      this._obj, // actual
      true // show diff
    );
  });
});

global.chai = chai;
global.expect = chai.expect;
global.sinon = sinon;
