import { Handle } from 'dojo-core/interfaces';
import { Parent, Child, ChildrenMap } from '../mixins/interfaces';
import { includes as arrayIncludes } from 'dojo-shim/array';

export type Position = number | 'first' | 'last' | 'before' | 'after';

export function arrayEquals<T, S>(from: any[], to: any[]): boolean {
	let result = true;
	if (!from || !to) {
		return false;
	}

	if (from.length !== to.length) {
		return false;
	}

	from.forEach((fromItem, index) => {
		if (Array.isArray(fromItem) && Array.isArray(to[index])) {
			if (!arrayEquals(fromItem, to[index])) {
				result = false;
				return;
			}
		}
		else if (fromItem !== to[index]) {
			result = false;
			return;
		}
	});

	return result;
}

function getIndex<T>(list: T[], item: T, position: Position, reference?: T): number {
	let idx: number;
	if (typeof position === 'number') {
		idx = position;
		const size = list.length;
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
			idx = list.length;
			break;
		case 'before':
			idx = reference === undefined ? -1 : list.indexOf(reference);
			if (idx === -1) {
				throw new Error('reference not contained in this list');
			}
			break;
		case 'after':
			idx = reference === undefined ? 0 : list.indexOf(reference) + 1;
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

/**
 * A type guard that checks to see if the value is a Child
 * @param value the value to guard for
 */
export function isChild<C extends Child>(value: any): value is C {
	return value && typeof value === 'object' && typeof value.render === 'function';
}

/**
 * A utility function that generates a handle that destroys any children
 * @param parent The parent that the handle relates to
 * @param child The child (or array of children) that the handle relates to
 */
export function getRemoveHandle<C extends Child>(parent: Parent, child: C | C[] | ChildrenMap<C>): Handle {
	function getDestroyHandle(c: C): Handle {
		let destroyed = false;
		return c.own({
			destroy() {
				if (destroyed) {
					return;
				}
				const { children } = parent;

				if (Array.isArray(children)) {
					const childrenCopy = [ ...children ];
					if (arrayIncludes(childrenCopy, c)) {
						childrenCopy.splice(childrenCopy.lastIndexOf(c), 1);
						parent.children = childrenCopy;
					}
				}
				else {
					children.forEach((value, key) => {
						if (c === value) {
							children.delete(key);
						}
					});
					parent.children = children;
				}
				destroyed = true;
			}
		});
	}

	let destroyed = false;

	if (Array.isArray(child)) {
		const handles = child.map((c) => getDestroyHandle(c));
		return {
			destroy() {
				if (destroyed) {
					return;
				}
				handles.forEach(({ destroy }) => destroy());
				destroyed = true;
			}
		};
	}
	else if (isChild(child)) {
		const handle = getDestroyHandle(child);
		return {
			destroy() {
				handle.destroy();
			}
		};
	}
	else {
		const handles: Handle[] = [];
		child.forEach((value) => {
			handles.push(getDestroyHandle(value));
		});
		return {
			destroy() {
				if (destroyed) {
					return;
				}
				handles.forEach(({ destroy }) => destroy());
				destroyed = true;
			}
		};
	}

}
