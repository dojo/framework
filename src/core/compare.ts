import { assign } from '@dojo/shim/object';
import { keys } from '@dojo/shim/object';
import Set from '@dojo/shim/Set';

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
 * Interface for a generic constructor function
 */
export interface Constructor {
	new (...args: any[]): object;
	prototype: object;
}

/**
 * A partial property descriptor that provides the property descriptor flags supported by the
 * complex property construction of `patch()`
 *
 * All properties are value properties, with the value being supplied by the `ConstructRecord`
 */
export interface ConstructDescriptor {
	/**
	 * Is the property configurable?
	 */
	configurable?: boolean;

	/**
	 * Is the property enumerable?
	 */
	enumerable?: boolean;

	/**
	 * Is the property configurable?
	 */
	writable?: boolean;
}

/**
 * A record that describes a constructor function and arguments necessary to create an instance of
 * an object
 */
export interface AnonymousConstructRecord {
	/**
	 * Any arguments to pass to the constructor function
	 */
	args?: any[];

	/**
	 * The constructor function to use to create the instance
	 */
	Ctor: Constructor;

	/**
	 * The partial descriptor that is used to set the value of the instance
	 */
	descriptor?: ConstructDescriptor;

	/**
	 * Any patches to properties that need to occur on the instance
	 */
	propertyRecords?: (ConstructRecord | PatchRecord)[];
}

export interface ConstructRecord extends AnonymousConstructRecord {
	/**
	 * The name of the property on the Object
	 */
	name: string;
}

/**
 * A record that describes the mutations necessary to a property of an object to make that property look
 * like another
 */
export type PatchRecord =
	| {
			/**
			 * The name of the property on the Object
			 */
			name: string;

			/**
			 * The type of the patch
			 */
			type: 'delete';
		}
	| {
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
			valueRecords?: (ConstructRecord | PatchRecord | SpliceRecord)[];
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
 * A record that describes how to instantiate a new object via a constructor function
 * @param Ctor The constructor function
 * @param args Any arguments to be passed to the constructor function
 */
/* tslint:disable:variable-name */
export function createConstructRecord(
	Ctor: Constructor,
	args?: any[],
	descriptor?: ConstructDescriptor
): AnonymousConstructRecord {
	const record: AnonymousConstructRecord = assign(objectCreate(null), { Ctor });
	if (args) {
		record.args = args;
	}
	if (descriptor) {
		record.descriptor = descriptor;
	}
	return record;
}
/* tslint:enable:variable-name */

/**
 * An internal function that returns a new patch record
 *
 * @param type The type of patch record
 * @param name The property name the record refers to
 * @param descriptor The property descriptor to be installed on the object
 * @param valueRecords Any subsequenet patch recrds to be applied to the value of the descriptor
 */
function createPatchRecord(
	type: PatchTypes,
	name: string,
	descriptor?: PropertyDescriptor,
	valueRecords?: (ConstructRecord | PatchRecord | SpliceRecord)[]
): PatchRecord {
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
function createValuePropertyDescriptor(
	value: any,
	writable: boolean = true,
	enumerable: boolean = true,
	configurable: boolean = true
): PropertyDescriptor {
	return assign(objectCreate(null), {
		value,
		writable,
		enumerable,
		configurable
	});
}

/**
 * A function that returns a constructor record or `undefined` when diffing a value
 */
export type CustomDiffFunction<T> = (
	value: T,
	nameOrIndex: string | number,
	parent: object
) => AnonymousConstructRecord | void;

/**
 * A class which is used when making a custom comparison of a non-plain object or array
 */
export class CustomDiff<T> {
	private _differ: CustomDiffFunction<T>;

	constructor(diff: CustomDiffFunction<T>) {
		this._differ = diff;
	}

	/**
	 * Get the difference of the `value`
	 * @param value The value to diff
	 * @param nameOrIndex A `string` if comparing a property or a `number` if comparing an array element
	 * @param parent The outer parent that this value is part of
	 */
	diff(value: T, nameOrIndex: string | number, parent: object): ConstructRecord | void {
		const record = this._differ(value, nameOrIndex, parent);
		if (record && typeof nameOrIndex === 'string') {
			return assign(record, { name: nameOrIndex });
		}
	}
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

	if (!lengthA && lengthB) {
		/* empty array */
		patchRecords.push(createSpliceRecord(0, lengthB));
		return patchRecords;
	}

	let add: any[] = [];
	let start = 0;
	let deleteCount = 0;
	let last = -1;

	function flushSpliceRecord() {
		if (deleteCount || add.length) {
			patchRecords.push(
				createSpliceRecord(start, start + deleteCount > lengthB ? lengthB - start : deleteCount, add)
			);
		}
	}

	function addDifference(index: number, adding: boolean, value?: any) {
		if (index > last + 1) {
			/* flush the splice */
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

		if (
			index in arrayB &&
			(valueA === valueB || (allowFunctionValues && typeof valueA === 'function' && typeof valueB === 'function'))
		) {
			return; /* not different */
		}

		const isValueAArray = isArray(valueA);
		const isValueAPlainObject = isPlainObject(valueA);

		if (isValueAArray || isValueAPlainObject) {
			const value = isValueAArray
				? isArray(valueB) ? valueB : []
				: isPlainObject(valueB) ? valueB : Object.create(null);
			const valueRecords = diff(valueA, value, options);
			if (valueRecords.length) {
				/* only add if there are changes */
				addDifference(index, true, diff(valueA, value, options));
			}
		} else if (isPrimitive(valueA)) {
			addDifference(index, true, valueA);
		} else if (allowFunctionValues && typeof valueA === 'function') {
			addDifference(index, true, valueA);
		} else {
			throw new TypeError(
				`Value of array element "${index}" from first argument is not a primative, plain Object, or Array.`
			);
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
function diffPlainObject(a: any, b: any, options: DiffOptions): (ConstructRecord | PatchRecord)[] {
	const { allowFunctionValues = false, ignorePropertyValues = [] } = options;
	const patchRecords: (ConstructRecord | PatchRecord)[] = [];
	const { comparableA, comparableB } = getComparableObjects(a, b, options);

	/* look for keys in a that are different from b */
	keys(comparableA).reduce((patchRecords, name) => {
		const valueA = a[name];
		const valueB = b[name];
		const bHasOwnProperty = hasOwnProperty.call(comparableB, name);

		if (
			bHasOwnProperty &&
			(valueA === valueB || (allowFunctionValues && typeof valueA === 'function' && typeof valueB === 'function'))
		) {
			/* not different */
			/* when `allowFunctionValues` is true, functions are simply considered to be equal by `typeof` */
			return patchRecords;
		}

		const type = bHasOwnProperty ? 'update' : 'add';

		const isValueAArray = isArray(valueA);
		const isValueAPlainObject = isPlainObject(valueA);

		if (isValueAArray || isValueAPlainObject) {
			/* non-primitive values we can diff */
			/* this is a bit complicated, but essentially if valueA and valueB are both arrays or plain objects, then
			* we can diff those two values, if not, then we need to use an empty array or an empty object and diff
			* the valueA with that */
			const value =
				(isValueAArray && isArray(valueB)) || (isValueAPlainObject && isPlainObject(valueB))
					? valueB
					: isValueAArray ? [] : objectCreate(null);
			const valueRecords = diff(valueA, value, options);
			if (valueRecords.length) {
				/* only add if there are changes */
				patchRecords.push(
					createPatchRecord(type, name, createValuePropertyDescriptor(value), diff(valueA, value, options))
				);
			}
		} else if (isCustomDiff(valueA) && !isCustomDiff(valueB)) {
			/* complex diff left hand */
			const result = valueA.diff(valueB, name, b);
			if (result) {
				patchRecords.push(result);
			}
		} else if (isCustomDiff(valueB)) {
			/* complex diff right hand */
			const result = valueB.diff(valueA, name, a);
			if (result) {
				patchRecords.push(result);
			}
		} else if (
			isPrimitive(valueA) ||
			(allowFunctionValues && typeof valueA === 'function') ||
			isIgnoredPropertyValue(name, a, b, ignorePropertyValues)
		) {
			/* primitive values, functions values if allowed, or ignored property values can just be copied */
			patchRecords.push(createPatchRecord(type, name, createValuePropertyDescriptor(valueA)));
		} else {
			throw new TypeError(
				`Value of property named "${name}" from first argument is not a primative, plain Object, or Array.`
			);
		}
		return patchRecords;
	}, patchRecords);

	/* look for keys in b that are not in a */
	keys(comparableB).reduce((patchRecords, name) => {
		if (!hasOwnProperty.call(comparableA, name)) {
			patchRecords.push(createPatchRecord('delete', name));
		}
		return patchRecords;
	}, patchRecords);

	return patchRecords;
}

/**
 * Takes two plain objects to be compared, as well as options customizing the behavior of the comparison, and returns
 * two new objects that contain only those properties that should be compared. If a property is ignored
 * it will not be included in either returned object. If a property's value should be ignored it will be excluded
 * if it is present in both objects.
 * @param a The first object to compare
 * @param b The second object to compare
 * @param options An options bag indicating which properties should be ignored or have their values ignored, if any.
 */
export function getComparableObjects(a: any, b: any, options: DiffOptions) {
	const { ignoreProperties = [], ignorePropertyValues = [] } = options;
	const ignore = new Set<string>();
	const keep = new Set<string>();

	const isIgnoredProperty = Array.isArray(ignoreProperties)
		? (name: string) => {
				return ignoreProperties.some(
					(value) => (typeof value === 'string' ? name === value : value.test(name))
				);
			}
		: (name: string) => ignoreProperties(name, a, b);

	const comparableA = keys(a).reduce(
		(obj, name) => {
			if (
				isIgnoredProperty(name) ||
				(hasOwnProperty.call(b, name) && isIgnoredPropertyValue(name, a, b, ignorePropertyValues))
			) {
				ignore.add(name);
				return obj;
			}

			keep.add(name);
			obj[name] = a[name];
			return obj;
		},
		{} as { [key: string]: any }
	);

	const comparableB = keys(b).reduce(
		(obj, name) => {
			if (ignore.has(name) || (!keep.has(name) && isIgnoredProperty(name))) {
				return obj;
			}

			obj[name] = b[name];
			return obj;
		},
		{} as { [key: string]: any }
	);

	return { comparableA, comparableB, ignore };
}

/**
 * A guard that determines if the value is a `ConstructRecord`
 * @param value The value to check
 */
function isConstructRecord(value: any): value is ConstructRecord {
	return Boolean(value && typeof value === 'object' && value !== null && value.Ctor && value.name);
}

function isIgnoredPropertyValue(
	name: string,
	a: any,
	b: any,
	ignoredPropertyValues: (string | RegExp)[] | IgnorePropertyFunction
) {
	return Array.isArray(ignoredPropertyValues)
		? ignoredPropertyValues.some((value) => {
				return typeof value === 'string' ? name === value : value.test(name);
			})
		: ignoredPropertyValues(name, a, b);
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
		value && typeof value === 'object' && (value.constructor === Object || value.constructor === undefined)
	);
}

/**
 * A guard that determines if the value is a primitive (including `null`), as these values are
 * fine to just copy.
 *
 * @param value The value to check
 */
function isPrimitive(value: any): value is string | number | boolean | undefined | null {
	const typeofValue = typeof value;
	return (
		value === null ||
		typeofValue === 'undefined' ||
		typeofValue === 'string' ||
		typeofValue === 'number' ||
		typeofValue === 'boolean'
	);
}

/**
 * A guard that determines if the value is a `CustomDiff`
 * @param value The value to check
 */
function isCustomDiff<T>(value: any): value is CustomDiff<T> {
	return typeof value === 'object' && value instanceof CustomDiff;
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
	} else {
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

const defaultConstructDescriptor = {
	configurable: true,
	enumerable: true,
	writable: true
};

function patchConstruct(target: any, record: ConstructRecord): any {
	const { args, descriptor = defaultConstructDescriptor, Ctor, name, propertyRecords } = record;
	const value = new Ctor(...(args || []));
	if (propertyRecords) {
		propertyRecords.forEach(
			(record) => (isConstructRecord(record) ? patchConstruct(value, record) : patchPatch(value, record))
		);
	}
	defineProperty(target, name, assign({ value }, descriptor));
	return target;
}

/**
 * An internal function that takes a value from array being patched and the target value from the same
 * index and determines the value that should actually be patched into the target array
 */
function resolveTargetValue(patchValue: any, targetValue: any): any {
	const patchIsSpliceRecordArray = isSpliceRecordArray(patchValue);
	return patchIsSpliceRecordArray || isPatchRecordArray(patchValue)
		? patch(
				patchIsSpliceRecordArray
					? isArray(targetValue) ? targetValue : []
					: isPlainObject(targetValue) ? targetValue : objectCreate(null),
				patchValue
			)
		: patchValue;
}

/**
 * Compares two plain objects or arrays and return a set of records which describe the differences between the two
 *
 * The records describe what would need to be applied to the second argument to make it look like the first argument
 *
 * @param a The plain object or array to compare with
 * @param b The plain object or array to compare to
 * @param options An options bag that allows configuration of the behaviour of `diff()`
 */
export function diff(a: any, b: any, options: DiffOptions = {}): (ConstructRecord | PatchRecord | SpliceRecord)[] {
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
export function patch(target: any, records: (ConstructRecord | PatchRecord | SpliceRecord)[]): any {
	if (!isArray(target) && !isPlainObject(target)) {
		throw new TypeError('A target for a patch must be either an array or a plain object.');
	}
	if (isFrozen(target) || isSealed(target)) {
		throw new TypeError('Cannot patch sealed or frozen objects.');
	}

	records.forEach((record) => {
		target = isSpliceRecord(record)
			? patchSplice(isArray(target) ? target : [], record) /* patch arrays */
			: isConstructRecord(record)
				? patchConstruct(target, record) /* patch complex object */
				: patchPatch(isPlainObject(target) ? target : {}, record); /* patch plain object */
	});
	return target;
}
