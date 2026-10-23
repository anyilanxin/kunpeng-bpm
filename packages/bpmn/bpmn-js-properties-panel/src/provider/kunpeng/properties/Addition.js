import { TextFieldEntry } from '@kunpeng-io/properties-panel';
import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';
import {
  useService
} from '../../../hooks';


export default function Addition(props) {

  const {
    idPrefix,
    addition
  } = props;

  const entries = [ {
    id: idPrefix + '-key',
    component: KeyProperty,
    addition,
    idPrefix
  },{
    id: idPrefix + '-value',
    component: ValueProperty,
    addition,
    idPrefix
  } ];

  return entries;
}

function KeyProperty(props) {
  const {
    idPrefix,
    element,
    addition
  } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: addition,
      properties: {
        key: value
      }
    });
  };

  const getValue = (addition) => {
    return addition.key;
  };

  return TextFieldEntry({
    element: addition,
    id: idPrefix + '-key',
    label: translate('Key'),
    getValue,
    setValue,
    debounce
  });
}

function ValueProperty(props) {
  const {
    idPrefix,
    element,
    addition
  } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: addition,
      properties: {
        value
      }
    });
  };

  const getValue = (addition) => {
    return addition.value;
  };

  return BpmnFeelEntry({
    element:addition,
    id: idPrefix + '-value',
    label: translate('Value'),
    getValue,
    setValue,
    debounce,
    feel: 'optional'
  });
}
