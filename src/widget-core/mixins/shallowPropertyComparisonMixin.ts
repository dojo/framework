import { entries } from '@dojo/shim/object';
import { WidgetProperties, PropertyComparison, PropertiesChangeRecord } from './../interfaces';
import { deepAssign } from '@dojo/core/lang';

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
	return Object.keys(from).every((key) => from[key] === to[key]);
}

/**
 * Mixin that overrides the `processProperties` method providing a comparison of attributes that goes a level deeper for
 * arrays and objects.
 *
 * For Objects, values for all `keys` are compared against the equivalent `key` on the `previousProperties`
 * attribute using `===`. If the `key` does not exists on the `previousProperties` attribute it is considered unequal.
 *
 * For Arrays, each `item` is compared with the `item` in the equivalent `index` of the `previousProperties` attribute.
 * If the `item` is an `object` then the object comparison described above is applied otherwise a simple `===` is used.
 */
const shallowPropertyComparisonMixin: { mixin: PropertyComparison<WidgetProperties> } = {
	mixin: {
		diffProperties<S>(this: S, previousProperties: WidgetProperties, newProperties: WidgetProperties): PropertiesChangeRecord<WidgetProperties> {
			const changedKeys: string[] = [];

			entries(newProperties).forEach(([key, value]) => {
				let isEqual = true;
				if (previousProperties.hasOwnProperty(key)) {
					const previousValue = (<any> previousProperties)[key];
					if (Array.isArray(value) && Array.isArray(previousValue)) {
						if (value.length !== previousValue.length) {
							isEqual = false;
						}
						else {
							isEqual = value.every((item: any, index: number) => {
								if (isObject(item)) {
									return shallowCompare(item, previousValue[index]);
								}
								else {
									return item === previousValue[index];
								}
							});
						}
					}
					else if (isObject(value) && isObject(previousValue)) {
						isEqual = shallowCompare(value, previousValue);
					}
					else {
						isEqual = value === previousValue;
					}
				}
				else {
					isEqual = false;
				}
				if (!isEqual) {
					changedKeys.push(key);
				}
			});
			return {
				changedKeys,
				properties: deepAssign({}, newProperties)
			};
		}
	}
};

export default shallowPropertyComparisonMixin;
