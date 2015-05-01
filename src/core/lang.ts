import * as observers from './observers/interfaces';
import ObjectObserver from './observers/ObjectObserver';

var slice = Array.prototype.slice;
var hasOwnProperty = Object.prototype.hasOwnProperty;

function isObject(item: any): boolean {
	return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof RegExp);
}

function copyArray(array: any[], kwArgs: CopyArgs): any[] {
	return array.map(function (item: any): any {
		if (Array.isArray(item)) {
			return copyArray(item, kwArgs);
		}

		return isObject(item) ?
			copy({
				sources: [ item ],
				deep: kwArgs.deep,
				descriptors: kwArgs.descriptors,
				inherited: kwArgs.inherited,
				assignPrototype: kwArgs.assignPrototype
			}) :
			item;
	});
}

export function copy(kwArgs: CopyArgs): any {
	var target: any;
	var sources: any[] = kwArgs.sources;

	if (!sources.length) {
		throw new RangeError('lang.copy requires at least one source object.');
	}

	if (kwArgs.assignPrototype) {
		// create from the same prototype
		target = Object.create(Object.getPrototypeOf(sources[0]));
	}
	else {
		// use the target or create a new object
		target = kwArgs.target || {};
	}

	for (var i = 0; i < sources.length; i++) {
		// iterate through all the sources
		var source: { [index: string]: any } = sources[i];
		var name: string;
		var value: any;

		if (kwArgs.descriptors) {
			// if we are copying descriptors, use to get{Own}PropertyNames so we get every property
			// (including non enumerables).
			var names = (kwArgs.inherited ? getPropertyNames : Object.getOwnPropertyNames)(source);

			for (var j = 0; j < names.length; j++) {
				name = names[j];
				// get the descriptor
				var descriptor = (kwArgs.inherited ?
					getPropertyDescriptor : Object.getOwnPropertyDescriptor)(source, name);
				value = descriptor.value;

				if (kwArgs.deep) {
					if (Array.isArray(value)) {
						descriptor.value = copyArray(value, kwArgs);
					}
					else if (isObject(value)) {
						descriptor.value = copy({
							sources: [ value ],
							deep: true,
							descriptors: true,
							inherited: kwArgs.inherited,
							assignPrototype: kwArgs.assignPrototype
						});
					}
				}

				// and copy to the target
				Object.defineProperty(target, name, descriptor);
			}
		}
		else {
			// If we aren't using descriptors, we use a standard for-in to simplify skipping
			// non-enumerables and inheritance. We could use Object.keys when we aren't inheriting.
			for (name in source) {
				if (kwArgs.inherited || hasOwnProperty.call(source, name)) {
					value = source[name];

					if (kwArgs.deep) {
						if (Array.isArray(value)) {
							value = copyArray(value, kwArgs);
						}
						else if (isObject(value)) {
							value = copy({
								sources: [ value ],
								deep: true,
								inherited: kwArgs.inherited,
								assignPrototype: kwArgs.assignPrototype
							});
						}
					}

					target[name] = value;
				}
			}
		}
	}

	return target;
}

export interface CopyArgs {
	deep?: boolean;
	descriptors?: boolean;
	inherited?: boolean;
	assignPrototype?: boolean;
	target?: any;
	sources: any[];
}

export function create(prototype: {}, ...mixins: {}[]): {} {
	if (!mixins.length) {
		throw new RangeError('lang.create requires at least one mixin object.');
	}

	return copy({
		assignPrototype: false,
		deep: false,
		descriptors: false,
		inherited: false,
		target: Object.create(prototype),
		sources: mixins
	});
}

export function duplicate(source: {}): {} {
	return copy({
		assignPrototype: true,
		deep: true,
		descriptors: true,
		sources: [ source ]
	});
}

export function getPropertyNames(object: {}): string[] {
	var setOfNames: {[index: string]: any} = {};
	var names : string[] = [];

	do {
		// go through each prototype to add the property names
		var ownNames = Object.getOwnPropertyNames(object);
		for (var i = 0, l = ownNames.length; i < l; i++) {
			var name = ownNames[i];
			// check to make sure we haven't added it yet
			if (setOfNames[name] !== true) {
				setOfNames[name] = true;
				names.push(name);
			}
		}
		object = Object.getPrototypeOf(object);
	} while (object && object !== Object.prototype);

	return names;
}

export function getPropertyDescriptor(object: Object, property: string): PropertyDescriptor {
	var descriptor: PropertyDescriptor;
	do {
		descriptor = Object.getOwnPropertyDescriptor(object, property);
	} while (!descriptor && (object = Object.getPrototypeOf(object)));

	return descriptor;
}

export function isIdentical(a: any, b: any): boolean {
	return a === b ||
		/* both values are NaN */
		(a !== a && b !== b);
}

export function lateBind(instance: {}, method: string, ...suppliedArgs: any[]): (...args: any[]) => any {
	return suppliedArgs.length ?
		function () {
			var args: any[] = arguments.length ? suppliedArgs.concat(slice.call(arguments)) : suppliedArgs;

			// TS7017
			return (<any> instance)[method].apply(instance, args);
		} :
		function () {
			return (<any> instance)[method].apply(instance, arguments);
		};
}

export function observe(target: {}, listener: (events: observers.PropertyEvent[]) => any): ObjectObserver {
	return new ObjectObserver({
		target: target,
		listener: listener
	});
}

export function partial(targetFunction: (...args: any[]) => any, ...suppliedArgs: any[]): (...args: any[]) => any {
	return function () {
		var args: any[] = arguments.length ? suppliedArgs.concat(slice.call(arguments)) : suppliedArgs;

		return targetFunction.apply(this, args);
	};
}
