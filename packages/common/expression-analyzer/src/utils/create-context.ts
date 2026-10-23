export function createContext(variables: { name: string }[]): Record<string, unknown> {
  return variables.reduce(
    (context, variable) => {
      context[variable.name] = () => {};

      return context;
    },
    {} as Record<string, unknown>,
  );
}
