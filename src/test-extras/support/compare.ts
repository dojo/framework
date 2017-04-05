import { assign } from '@dojo/core/lang';
import { keys } from '@dojo/shim/object';

/* Assigning to local variables to improve minification and readability */

const objectCreate = Object.create;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const defineProperty = Object.defineProperty;
const isArray = Array.isArray;
const isFrozen = Object.isFrozen;
const isSealed = Object.isSealed;

export type IgnorePropertyFunction = (name: string, a: any, b: any) => boolean;

export interface DiffOptions {
	/**
	 * Allow functions to be values.  Values will be considered equal if the `typeof` both values are `function`.
	 * When adding or updating the property, the value of the property of `a` will be used in the record, which
	 * will be a reference to the function.
	 */
	allowFunctionValues?: boolean;

	/**
	 * An array of strings or regular expressions which flag certain properties to be ignored.  Alternatively
	 * a function, which returns `true` to have the property ignored or `false` to diff the property.
	 */
	ignoreProperties?: (string | RegExp)[] | IgnorePropertyFunction;

	/**
	 * An array of strings or regular expressions which flag certain values to be ignored.  For flagged properties,
	 * if the property is present in both `a` and `b` the value will be ignored.  If adding the property,
	 * whatever the value of the property of `a` will be used, which could be a reference.
	 */
	ignorePropertyValues?: (string | RegExp)[] | IgnorePropertyFunction;
}

/**
 * A record that describes the mutations necessary to a property of an object to make that property look
 * like another
 */
export type PatchRecord = {
		/**
		 * The name of the property on the Object
		 */
		name: string;

		/**
		 * The type of the patch
		 */
		type: 'delete';
	} | {
		/**
		 * A property descriptor that describes the property in `name`
		 */
		descriptor: PropertyDescriptor;

		/**
		 * The name of the property on the Object
		 */
		name: string;

		/**
		 * The type of the patch
		 */
		type: 'add' | 'update';

		/**
		 * Additional patch records which describe the value of the property
		 */
		valueRecords?: (PatchRecord | SpliceRecord)[];
	};

/**
 * The different types of patch records supported
 */
export type PatchTypes = 'add' | 'update' | 'delete';

/**
 * A record that describes a splice operation to perform on an array to make the array look like another array
 */
export interface SpliceRecord {
	/**
	 * Any items that are being added to the array
	 */
	add?: any[];

	/**
	 * The number of items in the array to delete
	 */
	deleteCount: number;

	/**
	 * The type, set to `splice`
	 */
	type: 'splice';

	/**
	 * The index of where to start the splice
	 */
	start: number;
}

/**
 * An internal function that returns a new patch record
 *
 * @param type The type of patch record
 * @param name The property name the record refers to
 * @param descriptor The property descriptor to be installed on the object
 * @param valueRecords Any subsequenet patch recrds to be applied to the value of the descriptor
 */
function createPatchRecord(type: PatchTypes, name: string, descriptor?: PropertyDescriptor, valueRecords?: (PatchRecord | SpliceRecord)[]): PatchRecord {
	const patchRecord = assign(objectCreate(null), {
		type,
		name
	});

	if (descriptor) {
		patchRecord.descriptor = descriptor;
	}
	if (valueRecords) {
		patchRecord.valueRecords = valueRecords;
	}

	return patchRecord as PatchRecord;
}

/**
 * An internal function that returns a new splice record
 *
 * @param start Where in the array to start the splice
 * @param deleteCount The number of elements to delete from the array
 * @param add Elements to be added to the target
 */
function createSpliceRecord(start: number, deleteCount: number, add?: any[]): SpliceRecord {
	const spliceRecord: SpliceRecord = assign(objectCreate(null), {
		type: 'splice',
		start,
		deleteCount
	});

	if (add && add.length) {
		spliceRecord.add = add;
	}

	return spliceRecord;
}

/**
 * A function that produces a value property descriptor, which assumes that properties are enumerable, writable and configurable
 * unless specified
 *
 * @param value The value for the descriptor
 * @param writable Defaults to `true` if not specified
 * @param enumerable Defaults to `true` if not specified
 * @param configurable Defaults to `true` if not specified
 */
function createValuePropertyDescriptor(value: any, writable: boolean = true, enumerable: boolean = true, configurable: boolean = true): PropertyDescriptor {
	return assign(objectCreate(null), {
		value,
		writable,
		enumerable,
		configurable
	});
}

/**
 * Internal function that detects the differences between an array and another value and returns a set of splice records that
 * describe the differences
 *
 * @param a The first array to compare to
 * @param b The second value to compare to
 * @param options An options bag that allows configuration of the behaviour of `diffArray()`
 */
function diffArray(a: any[], b: any, options: DiffOptions): SpliceRecord[] {
	/* This function takes an overly simplistic approach to calculating splice records.  There are many situations where
	 * in complicated array mutations, the splice records can be more optimised.
	 *
	 * TODO: Raise an issue for this when it is finally merged and put into core
	 */

	const { allowFunctionValues = false } = options;

	const arrayA = a;
	const lengthA = arrayA.length;
	const arrayB = isArray(b) ? b : [];
	const lengthB = arrayB.length;
	const patchRecords: SpliceRecord[] = [];

	if (!lengthA && lengthB) { /* empty array */
		patchRecords.push(createSpliceRecord(0, lengthB));
		return patchRecords;
	}

	let add: any[] = [];
	let start = 0;
	let deleteCount = 0;
	let last = -1;

	function flushSpliceRecord() {
		if (deleteCount || add.length) {
			patchRecords.push(createSpliceRecord(start, start + deleteCount > lengthB ? lengthB - start : deleteCount, add));
		}
	}

	function addDifference(index: number, adding: boolean, value?: any) {
		if (index > (last + 1)) { /* flush the splice */
			flushSpliceRecord();
			start = index;
			deleteCount = 0;
			if (add.length) {
				add = [];
			}
		}

		if (adding) {
			add.push(value);
		}
		deleteCount++;
		last = index;
	}

	arrayA.forEach((valueA, index) => {
		const valueB = arrayB[index];

		if (index in arrayB && (valueA === valueB || (allowFunctionValues && typeof valueA === 'function' && typeof valueB === 'function'))) {
			return; /* not different */
		}

		const isValueAArray = isArray(valueA);
		const isValueAPlainObject = isPlainObject(valueA);

		if (isValueAArray || isValueAPlainObject) {
			const value = isValueAArray ? isArray(valueB) ? valueB : [] : isPlainObject(valueB) ? valueB : Object.create(null);
			const valueRecords = diff(valueA, value, options);
			if (valueRecords.length) { /* only add if there are changes */
				addDifference(index, true, diff(valueA, value, options));
			}
		}
		else if (isPrimitive(valueA)) {
			addDifference(index, true, valueA);
		}
		else if (allowFunctionValues && typeof valueA === 'function') {
			addDifference(index, true, valueA);
		}
		else {
			throw new TypeError(`Value of array element "${index}" from first argument is not a primative, plain Object, or Array.`);
		}
	});

	if (lengthB > lengthA) {
		for (let index = lengthA; index < lengthB; index++) {
			addDifference(index, false);
		}
	}

	/* flush any deletes */
	flushSpliceRecord();

	return patchRecords;
}

/**
 * Internal function that detects the differences between plain objects and returns a set of patch records that
 * describe the differences
 *
 * @param a The first plain object to compare to
 * @param b The second plain bject to compare to
 * @param options An options bag that allows configuration of the behaviour of `diffPlainObject()`
 */
function diffPlainObject(a: any, b: any, options: DiffOptions): PatchRecord[] {
	const { allowFunctionValues = false, ignoreProperties = [], ignorePropertyValues = [] } = options;
	const patchRecords: PatchRecord[] = [];

	function isIgnoredProperty(name: string) {
		return Array.isArray(ignoreProperties) ? ignoreProperties.some((value) => {
			return typeof value === 'string' ? name === value : value.test(name);
		}) : ignoreProperties(name, a, b);
	}

	function isIgnoredPropertyValue(name: string) {
		return Array.isArray(ignorePropertyValues) ? ignorePropertyValues.some((value) => {
			return typeof value === 'string' ? name === value : value.test(name);
		}) : ignorePropertyValues(name, a, b);
	}

	/* look for keys in a that are different from b */
	keys(a).reduce((patchRecords, name) => {
		if (!isIgnoredProperty(name)) {
			const valueA = a[name];
			const valueB = b[name];
			const bHasOwnProperty = hasOwnProperty.call(b, name);

			if (bHasOwnProperty && (valueA === valueB ||
				(allowFunctionValues && typeof valueA === 'function' && typeof valueB === 'function') ||
				isIgnoredPropertyValue(name))) { /* not different */
					/* when `allowFunctionValues` is true, functions are simply considered to be equal by `typeof` */
					return patchRecords;
			}

			const type = bHasOwnProperty ? 'update' : 'add';

			const isValueAArray = isArray(valueA);
			const isValueAPlainObject = isPlainObject(valueA);

			if ((isValueAArray || isValueAPlainObject) && !(isIgnoredPropertyValue(name))) { /* non-primitive values we can diff */
				/* this is a bit complicated, but essentially if valueA and valueB are both arrays or plain objects, then
				* we can diff those two values, if not, then we need to use an empty array or an empty object and diff
				* the valueA with that */
				const value = (isValueAArray && isArray(valueB)) || (isValueAPlainObject && isPlainObject(valueB)) ?
					valueB : isValueAArray ?
						[] : objectCreate(null);
				const valueRecords = diff(valueA, value, options);
				if (valueRecords.length) { /* only add if there are changes */
					patchRecords.push(createPatchRecord(type, name, createValuePropertyDescriptor(value), diff(valueA, value, options)));
				}
			}
			else if (isPrimitive(valueA) || (allowFunctionValues && typeof valueA === 'function') || isIgnoredPropertyValue(name)) {
				/* primitive values, functions values if allowed, or ignored property values can just be copied */
				patchRecords.push(createPatchRecord(type, name, createValuePropertyDescriptor(valueA)));
			}
			else {
				throw new TypeError(`Value of property named "${name}" from first argument is not a primative, plain Object, or Array.`);
			}
		}
		return patchRecords;
	}, patchRecords);

	/* look for keys in b that are not in a */
	keys(b).reduce((patchRecords, name) => {
		if (!hasOwnProperty.call(a, name) && !isIgnoredProperty(name)) {
			patchRecords.push(createPatchRecord('delete', name));
		}
		return patchRecords;
	}, patchRecords);

	return patchRecords;
}

/**
 * A guard that determines if the value is a `PatchRecord`
 *
 * @param value The value to check
 */
function isPatchRecord(value: any): value is PatchRecord {
	return Boolean(value && value.type && value.name);
}

/**
 * A guard that determines if the value is an array of `PatchRecord`s
 *
 * @param value The value to check
 */
function isPatchRecordArray(value: any): value is PatchRecord[] {
	return Boolean(isArray(value) && value.length && isPatchRecord(value[0]));
}

/**
 * A guard that determines if the value is a plain object.  A plain object is an object that has
 * either no constructor (e.g. `Object.create(null)`) or has Object as its constructor.
 *
 * @param value The value to check
 */
function isPlainObject(value: any): value is Object {
	return Boolean(
		value &&
		typeof value === 'object' &&
		(value.constructor === Object || value.constructor === undefined)
	);
}

/**
 * A guard that determines if the value is a primitive (including `null`), as these values are
 * fine to just copy.
 *
 * @param value The value to check
 */
function isPrimitive(value: any): value is (string | number | boolean | undefined | null) {
	const typeofValue = typeof value;
	return value === null ||
		typeofValue === 'undefined' ||
		typeofValue === 'string' ||
		typeofValue === 'number' ||
		typeofValue === 'boolean';
}

/**
 * A guard that determines if the value is a `SpliceRecord`
 *
 * @param value The value to check
 */
function isSpliceRecord(value: any): value is SpliceRecord {
	return value && value.type === 'splice' && 'start' in value && 'deleteCount' in value;
}

/**
 * A guard that determines if the value is an array of `SpliceRecord`s
 *
 * @param value The value to check
 */
function isSpliceRecordArray(value: any): value is SpliceRecord[] {
	return Boolean(isArray(value) && value.length && isSpliceRecord(value[0]));
}

/**
 * An internal function that patches a target with a `SpliceRecord`
 */
function patchSplice(target: any[], { add, deleteCount, start }: SpliceRecord): any {
	if (add && add.length) {
		const deletedItems = deleteCount ? target.slice(start, start + deleteCount) : [];
		add = add.map((value, index) => resolveTargetValue(value, deletedItems[index]));
		target.splice(start, deleteCount, ...add);
	}
	else {
		target.splice(start, deleteCount);
	}
	return target;
}

/**
 * An internal function that patches a target with a `PatchRecord`
 */
function patchPatch(target: any, record: PatchRecord): any {
	const { name } = record;
	if (record.type === 'delete') {
		delete target[name];
		return target;
	}
	const { descriptor, valueRecords } = record;
	if (valueRecords && valueRecords.length) {
		descriptor.value = patch(descriptor.value, valueRecords);
	}
	defineProperty(target, name, descriptor);
	return target;
}

/**
 * An internal function that take a value from array being patched and the target value from the same
 * index and determines the value that should actually be patched into the target array
 */
function resolveTargetValue(patchValue: any, targetValue: any): any {
	const patchIsSpliceRecordArray = isSpliceRecordArray(patchValue);
	return (patchIsSpliceRecordArray || isPatchRecordArray(patchValue)) ?
		patch(
			patchIsSpliceRecordArray ?
				isArray(targetValue) ?
					targetValue : [] : isPlainObject(targetValue) ?
						targetValue : objectCreate(null),
			patchValue
		) :
		patchValue;
}

/**
 * Compares to plain objects or arrays and return a set of records which describe the differences between the two
 *
 * The records describe what would need to be applied to the second argument to make it look like the first argument
 *
 * @param a The plain object or array to compare with
 * @param b The plain object or array to compare to
 * @param options An options bag that allows configuration of the behaviour of `diff()`
 */
export function diff(a: any, b: any, options: DiffOptions = {}): (PatchRecord | SpliceRecord)[] {
	if (typeof a !== 'object' || typeof b !== 'object') {
		throw new TypeError('Arguments are not of type object.');
	}

	if (isArray(a)) {
		return diffArray(a, b, options);
	}

	if (isArray(b)) {
		b = objectCreate(null);
	}

	if (!isPlainObject(a) || !isPlainObject(b)) {
		throw new TypeError('Arguments are not plain Objects or Arrays.');
	}

	return diffPlainObject(a, b, options);
}

/**
 * Apply a set of patch records to a target.
 *
 * @param target The plain object or array that the patch records should be applied to
 * @param records A set of patch records to be applied to the target
 */
export function patch(target: any, records: (PatchRecord | SpliceRecord)[]): any {
	if (!isArray(target) && !isPlainObject(target)) {
		throw new TypeError('A target for a patch must be either an array or a plain object.');
	}
	if (isFrozen(target) || isSealed(target)) {
		throw new TypeError('Cannot patch sealed or frozen objects.');
	}

	records.forEach((record) => {
		target = isSpliceRecord(record) ?
			patchSplice(isArray(target) ?
				target : [], record) : patchPatch(isPlainObject(target) ?
					target : objectCreate(null), record);
	});
	return target;
}
