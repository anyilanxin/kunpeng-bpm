// Minimal shim for mocha-test-container-support, used by
// bpmn-js/test/helper. Under vitest (happy-dom) there is no mocha test
// context, so we simply return a fresh <div> appended to <body>.
export default {
  get: function() {
    var container = document.createElement('div');
    container.classList.add('test-content-container');
    document.body.appendChild(container);
    return container;
  }
};
