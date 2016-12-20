import { entries } from 'dojo-shim/object';
import { WidgetProperties } from './../interfaces';

/**
 * Interface for `diffProperties`
 */
export interface ShallowPropertyComparisonMixin {
	diffProperties<T>(previousProperties: T): string[];
}

/**
 * Determine if the value is an Object
 */
function isObject(value: any) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Shallow comparison of all keys on the objects
 */
function shallowCompare(from: any, to: any) {
	if (to) {
		return Object.keys(from).every((key) => from[key] === to[key]);
	}
	return false;
}

/**
 * Mixin that overrides the `diffProperties` method providing a shallow comparison of attributes.
 *
 * For Objects, values for all `keys` are compared against the equivalent `key` on the `previousProperties`
 * attribute using `===`. If the `key` does not exists on the `previousProperties` attribute it is considered unequal.
 *
 * For Arrays, each `item` is compared with the `item` in the equivalent `index` of the `previousProperties` attribute.
 * If the `item` is an `object` then the object comparison described above is applied otherwise a simple `===` is used.
 */
const shallowPropertyComparisonMixin: { mixin: ShallowPropertyComparisonMixin } = {
	mixin: {
		diffProperties<T extends WidgetProperties>(this: { properties: T }, previousProperties: T): string[] {
			const changedPropertyKeys: string[] = [];

			entries(this.properties).forEach(([key, value]) => {
				let isEqual = true;
				if (previousProperties.hasOwnProperty(key)) {
					if (!(typeof value === 'function')) {
						if (Array.isArray(value)) {
							isEqual = value.every((item: any, index: number) => {
								if (isObject(item)) {
									return shallowCompare(item, previousProperties[key][index]);
								}
								else {
									return item === previousProperties[key][index];
								}
							});
						}
						else if (isObject(value)) {
							isEqual = shallowCompare(value, previousProperties[key]);
						}
						else {
							isEqual = value === previousProperties[key];
						}
					}
				}
				else {
					isEqual = false;
				}
				if (!isEqual) {
					changedPropertyKeys.push(key);
				}
			});
			return changedPropertyKeys;
		}
	}
};

export default shallowPropertyComparisonMixin;
