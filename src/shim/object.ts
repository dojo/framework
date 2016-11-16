import has from './support/has';
import './Symbol';

namespace Shim {
	export function is(value1: any, value2: any): boolean {
		if (value1 === value2) {
			return value1 !== 0 || 1 / value1 === 1 / value2; // -0
		}
		return value1 !== value1 && value2 !== value2; // NaN
	}

	export function getOwnPropertySymbols(o: any): symbol[] {
		return Object.getOwnPropertyNames(o).filter((key) => Boolean(key.match(/^@@.+/)))
			.map((key) => Symbol.for(key.substring(2)));
	}

	export function getOwnPropertyNames(o: any): string[] {
		return Object.getOwnPropertyNames(o).filter((key) => !Boolean(key.match(/^@@.+/)));
	}

	export function keys(o: any): string[] {
		return Object.keys(o).filter((key) => !Boolean(key.match(/^@@.+/)));
	}
}

/**
 * Determines whether two values are the same value.
 *
 * @param value1 The first value to compare
 * @param value2 The second value to compare
 * @return true if the values are the same; false otherwise
 */
export const is: (value1: any, value2: any) => boolean = 'is' in Object
	? (<any> Object).is
	: Shim.is;

/**
 * Detect if there is native support for Symbol properties in Object
 */
const hasGetOwnPropertySymbols = has('es6-symbol') && 'getOwnPropertySymbols' in Object;

/**
 * Returns an array of own properties who key is a symbol
 *
 * @param o The object to return the properties for
 */
export const getOwnPropertySymbols: (o: any) => symbol[] = hasGetOwnPropertySymbols
	? (<any> Object).getOwnPropertySymbols
	: Shim.getOwnPropertySymbols;

/**
 * Returns an array of own properties who key is a string
 *
 * @param o The object to return the properties for
 */
/* intentionally detecting `getOwnPropertySymbols` because we should should provide the shim
 * when there is no support for symbols */
export const getOwnPropertyNames: (o: any) => string[] = hasGetOwnPropertySymbols
	? Object.getOwnPropertyNames
	: Shim.getOwnPropertyNames;

/**
 * Returns the names of the enumerable properties and methods of an object.
 * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object Model (DOM) object.
 */
/* intentionally detecting `getOwnPropertySymbols` because we should should provide the shim
 * when there is no support for symbols */
export const keys: (o: any) => string[] = hasGetOwnPropertySymbols
	? Object.keys
	: Shim.keys;
