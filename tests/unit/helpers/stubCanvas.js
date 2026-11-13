export function stubCanvas(width, height) {
  const calls = [];
  const assigned = new Map();
  const recorder = (name) => (...args) => {
    calls.push({ method: name, args });
    if (name === "createLinearGradient") {
      return {
        description: `gradient(${args.join(",")})`,
        addColorStop: (...stopArgs) => calls.push({ method: "addColorStop", args: stopArgs }),
      };
    }
    return undefined;
  };
  const context = new Proxy({}, {
    get: (_, name) => (assigned.has(name) ? assigned.get(name) : recorder(name)),
    set: (_, name, value) => {
      assigned.set(name, value);
      calls.push({ set: name, value: typeof value === "object" ? value.description : value });
      return true;
    },
  });
  return { width, height, calls, getContext: () => context };
}
