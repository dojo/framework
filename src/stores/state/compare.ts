import Set from '../../shim/Set';
import { from } from '../../shim/array';

export function isObject(value: any): value is Object {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function isEqual(a: any, b: any): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((element: any, i: number) => isEqual(element, b[i]));
	} else if (isObject(a) && isObject(b)) {
		const keysForA = Object.keys(a).sort();
		const keysForB = Object.keys(b).sort();
		return isEqual(keysForA, keysForB) && keysForA.every((key) => isEqual(a[key], b[key]));
	} else {
		return a === b;
	}
}

function findArrayDifference(a: any[], b: any[]): number {
	const min = Math.min(a.length, b.length);
	for (let i = 0; i < min; i++) {
		if (!isEqual(a[i], b[i])) {
			return i;
		}
	}

	if (a.length !== b.length) {
		return min;
	}

	return -1;
}

function findShallowObjectKeyDifference(a: { [key: string]: any }, b: { [key: string]: any }): string | undefined {
	const keys = from(new Set([...Object.keys(a), ...Object.keys(b)]).values());

	for (let key of keys) {
		if (!isEqual(a[key], b[key])) {
			return key;
		}
	}
}

export function getFriendlyDifferenceMessage(expected: any, actual: any): string {
	const actualType = getFriendlyTypeName(actual);
	const expectedType = getFriendlyTypeName(expected);

	if (Array.isArray(expected) && Array.isArray(actual)) {
		const offset = findArrayDifference(expected, actual);

		if (offset !== -1) {
			return `Arrays differed at offset ${offset}`;
		}
		return 'Arrays are identical';
	} else if (isObject(expected) && isObject(actual)) {
		const key = findShallowObjectKeyDifference(expected, actual);

		if (key) {
			const expectedValue = expected[key];
			const actualValue = actual[key];
			return `Expected "${expectedValue}" for object property ${key} but got "${actualValue}" instead`;
		}
		return 'Objects are identical';
	} else if (!isEqual(expected, actual)) {
		if (actualType === expectedType) {
			return `Expected "${expected}" but got "${actual}" instead`;
		} else {
			return `Expected ${expectedType} "${expected}" but got ${actualType} "${actual}" instead`;
		}
	}

	return 'Values are identical';
}

function getFriendlyTypeName(value: any): string {
	if (Array.isArray(value)) {
		return 'array';
	}
	return typeof value;
}
