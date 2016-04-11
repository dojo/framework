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
