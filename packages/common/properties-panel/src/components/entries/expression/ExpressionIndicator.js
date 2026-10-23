export function ExpressionIndicator(props) {
  const {
    active
  } = props;

  if (!active) {
    return null;
  }

  return <span class="bio-properties-panel-expression-indicator">
    =
  </span>;
}
