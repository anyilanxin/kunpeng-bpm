export default class RemoveElementTemplateHandler {
  constructor(commandStack) {
    this._commandStack = commandStack;
  }

  preExecute(context) {
    const {
      element,
      oldTemplate
    } = context;

    this._commandStack.execute('propertiesPanel.kunpeng.changeTemplate', {
      element,
      oldTemplate,
      newTemplate: null,
      removeProperties: true
    });
  }
}


RemoveElementTemplateHandler.$inject = [ 'commandStack' ];
