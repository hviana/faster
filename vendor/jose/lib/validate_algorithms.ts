export default (option: string, algorithms?: string[]) => {
  if (
    algorithms !== undefined &&
    (!Array.isArray(algorithms) ||
      algorithms.some((s) => typeof s !== "string"))
  ) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }

  if (!algorithms) {
    return undefined;
  }

  return new Set(algorithms);
};
