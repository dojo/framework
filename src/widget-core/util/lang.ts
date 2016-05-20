import { List } from 'immutable/immutable';

export type Position = number | 'first' | 'last' | 'before' | 'after';

function getIndex<T>(list: List<T> | T[], item: T, position: Position, reference?: T): number {
	let idx: number;
	if (typeof position === 'number') {
		idx = position;
		const size = Array.isArray(list) ? list.length : list.size;
		if (idx < 0 || idx > size) {
			throw new Error('position is out of range');
		}
	}
	else {
		switch (position) {
		case 'first':
			idx = 0;
			break;
		case 'last':
			idx = Array.isArray(list) ? list.length : list.size;
			break;
		case 'before':
			idx = list.indexOf(reference);
			if (idx === -1) {
				throw new Error('reference not contained in this list');
			}
			break;
		case 'after':
			idx = list.indexOf(reference) + 1;
			if (idx === 0) {
				throw new Error('reference not contained in this list');
			}
			break;
		default:
			throw Error(`Invalid position "${position}"`);
		}
	}
	return idx;
}

export function insertInList<T>(list: List<T>, item: T, position: Position, reference?: T): List<T> {
	return list.insert(getIndex(list, item, position, reference), item);
}

export function insertInArray<T>(array: T[], item: T, position: Position, reference?: T): T[] {
	array.splice(getIndex(array, item, position, reference), 0, item);
	return array;
}

function valueReplacer(key: string, value: any): any {
	if (value instanceof RegExp) {
		return (`__RegExp(${value.toString()})`);
	}
	return value;
}

function valueReviver(key: string, value: any): any {
	if (value.toString().indexOf('__RegExp(') === 0) {
		const [ , regExpStr ] = value.match(/__RegExp\(([^\)]*)\)/);
		const [ , regExp, flags ] = regExpStr.match(/^\/(.*?)\/([gimy]*)$/);
		return new RegExp(regExp, flags);
	}
	return value;
}

/**
 * Internal function to convert a state value to a string
 * @param value The value to be converted
 */
export function valueToString(value: any): string {
	return value
		? Array.isArray(value) || typeof value === 'object'
			? JSON.stringify(value, valueReplacer) : String(value)
		: value === 0
			? '0' : value === false
				? 'false' : '';
}

/**
 * Internal function to convert a string to the likely more complex value stored in
 * state
 * @param str The string to convert to a state value
 */
export function stringToValue(str: string): any {
	try {
		const value = JSON.parse(str, valueReviver);
		return value;
	}
	catch (e) {
		if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(str)) {
			return Number(str);
		}
		if (str) {
			return str;
		}
		return undefined;
	}
}
