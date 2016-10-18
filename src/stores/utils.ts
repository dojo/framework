export function shouldRecurseInto(value: any): value is Object {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function isEqual(a: any, b: any): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((element: any, i: number) => isEqual(element, b[i]));
	}
	else if (shouldRecurseInto(a) && shouldRecurseInto(b)) {
		const keysForA = Object.keys(a).sort();
		const keysforB = Object.keys(b).sort();
		return isEqual(keysForA, keysforB) && keysForA.every(key => isEqual(a[key], b[key]));
	}
	else {
		return a === b;
	}
}
