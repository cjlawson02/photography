const definedProps = <T extends Record<string, unknown>>(obj: T) =>
	Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

/** Shallow-merge `obj2` onto `obj1`, dropping keys whose value is `undefined`. */
export const mergeDefined = <T extends Record<string, unknown>>(
	obj1: T,
	obj2: Partial<T>,
) => ({ ...obj1, ...definedProps(obj2) });
