import {
  getBusinessObject,
  is
} from '@kunpeng/dmn-js-shared/lib/util/ModelUtil';

import { TextFieldEntry, isTextFieldEntryEdited } from '@kunpeng/properties-panel';

import {
  useService
} from '../../../hooks';

{ /* Required to break up imports, see https://github.com/babel/babel/issues/15156 */ }


export function VersionTagProps(props) {
  const {
    element
  } = props;

  if (!is(element, 'dmn:Decision')) {
    return [];
  }

  return [
    {
      id: 'versionTag',
      component: VersionTag,
      isEdited: isTextFieldEntryEdited
    },
  ];
}

/**
 * kunpeng:versionTag 是 dmn:Decision 上的单值扩展属性（kunpeng-dmn-moddle
 * 抽象 mixin + isAttr 注入，2026-10-26 schema 定案）——读写走
 * modeling.updateProperties 单命令属性路径，不再经 extensionElements
 * 多命令链。
 */
function VersionTag(props) {
  const { element } = props;

  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return getBusinessObject(element).get('kunpeng:versionTag');
  };

  const setValue = (value) => {
    modeling.updateProperties(element, {
      'kunpeng:versionTag': value
    });
  };

  return TextFieldEntry({
    element,
    id: 'versionTag',
    label: translate('Version tag'),
    getValue,
    setValue,
    debounce
  });
}
