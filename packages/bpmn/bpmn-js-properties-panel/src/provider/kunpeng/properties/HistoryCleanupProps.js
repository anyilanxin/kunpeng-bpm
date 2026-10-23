import {
  getBusinessObject,
  is
} from '@kunpeng-io/bpmn-js';

import { BpmnFeelEntry } from '../../../entries/BpmnFeelEntry';
import {
  isFeelEntryEdited,
} from '@kunpeng-io/properties-panel';
import {
  useService
} from '../../../hooks';


export function HistoryCleanupProps(props) {
  const {
    element
  } = props;

  const businessObject = getBusinessObject(element);

  if (!is(element, 'bpmn:Process') &&
      !(is(element, 'bpmn:Participant') && businessObject.get('processRef'))) {
    return [];
  }

  return [
    {
      id: 'historyTimeToLive',
      component: HistoryTimeToLive,
      isEdited: isFeelEntryEdited
    },
  ];
}

function HistoryTimeToLive(props) {
  const { element } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const process = getProcess(element);

  const getValue = () => {
    return process.get('kunpeng:historyTimeToLive') || '';
  };

  const setValue = (value) => {
    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: process,
      properties: {
        'kunpeng:historyTimeToLive': value
      }
    });
  };

  return BpmnFeelEntry({
    element,
    id: 'historyTimeToLive',
    label: translate('Time to live'),
    getValue,
    setValue,
    debounce,
    feel: 'optional',
    tooltip: getHistoryTimeToLiveValueDescription(translate)
  });
}


// helper //////////////////

function getProcess(element) {
  return is(element, 'bpmn:Process') ?
    getBusinessObject(element) :
    getBusinessObject(element).get('processRef');
}


function getHistoryTimeToLiveValueDescription(translate) {
  return (
    <div>
      <p>
        { translate('Number of days before this resource is being cleaned up. If specified, takes precedence over the engine configuration.The value can only be greater than or equal to -1. default -1,Do not perform cleaning.') }{ ' '}
        <a href="https://docs.camunda.org/manual/latest/user-guide/process-engine/history/" target="_blank" rel="noopener noreferrer">{ translate('Learn more.') }</a>
      </p>
    </div>
  );
}
