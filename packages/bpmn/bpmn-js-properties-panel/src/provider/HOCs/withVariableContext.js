import { getVariablesForElement } from '@kunpeng-io/extract-process-variables';
import { useEffect, useState } from '@kunpeng-io/properties-panel/preact/hooks';
import { useService } from '../../hooks';

{ /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */ }

const fallbackResolver = {
  getVariablesForElement: async (bo, element) => {

    // guard: root elements (collaboration, implicit root, etc.) have no
    // resolvable business object / scope. The Zeebe extractor's getScope()
    // accesses bo.id unguarded and would throw
    // "Cannot read properties of undefined (reading 'id')".
    // Return an empty variable list instead of crashing the properties panel.
    if (!bo || !bo.id) {
      return [];
    }

    try {
      return await getVariablesForElement(element || bo);
    } catch (err) {
      return [];
    }
  }
};

export function withVariableContext(Component) {
  return props => {
    const { bpmnElement, element } = props;

    const bo = (bpmnElement || element).businessObject;

    const [ variables, setVariables ] = useState([]);
    const eventBus = useService('eventBus');

    const variableResolver = useServiceIfAvailable('variableResolver', fallbackResolver);

    useEffect(() => {
      const extractVariables = async () => {

        const variables = await variableResolver.getVariablesForElement(bo, element);

        setVariables(variables.map(variable => {
          return {
            ...variable,
            info: variable.info ||
                  (variable.origin && ('Written in ' + variable.origin.map(origin => origin.name || origin.id).join(', ')))
          };
        }));
      };

      // The callback must return undefined, so the event propagation is not canceled.
      // Cf. https://github.com/camunda/camunda-modeler/issues/3392
      const callback = () => {
        extractVariables();
      };

      eventBus.on('commandStack.changed', callback);
      callback();

      return () => {
        eventBus.off('commandStack.changed', callback);
      };
    }, [ bo ]);

    return <Component { ...props } variables={ variables }></Component>;
  };
}

// helpers //////////

function useServiceIfAvailable(service, fallback) {
  const resolved = useService(service, false);

  if (!resolved) {
    return fallback;
  }

  return resolved;
}
