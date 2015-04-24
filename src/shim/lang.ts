var slice = Array.prototype.slice;

export function copy(args: CopyArgs): any {

	var target: any;
	var sources: any[] = args.sources;
	if (args.assignPrototype) {
		// create from the same prototype
		target = Object.create(Object.getPrototypeOf(sources[0]));
	} else {
		// use the target or create a new object
		target = args.target || {};
	}
	for (var i = 0; i < sources.length; i++) {
		// iterate through all the sources
		var source: {[index: string]: any} = sources[i];
		var name: string;
		var value: any;
		if (args.descriptors) {
			// if we are copying descriptors, use to get{Own}PropertyNames so we get every property
			// (including non enumerables).
			var names = (args.inherited ? getPropertyNames : Object.getOwnPropertyNames)(source);
			for (var j = 0; j < names.length; j++) {
				name = names[j];
				// get the descriptor
				var descriptor = (args.inherited ?
					getPropertyDescriptor : Object.getOwnPropertyDescriptor)(source, name);
				value = descriptor.value;
				// deep copy if necessary
				if (value && typeof value === 'object' && args.deep) {
					descriptor.value = copy({
							sources: [value],
							deep: true,
							descriptors: true,
							inherited: args.inherited,
							assignPrototype: args.assignPrototype
						});
				}
				// and copy to the target
				Object.defineProperty(target, name, descriptor);
			}
		} else {
			// if we aren't using descriptors, we use a standard for-in to simplify skipping
			// non-enumerables and inheritance. We could use Object.keys when we aren't inheriting
			for (name in source) {
				if (args.inherited || source.hasOwnProperty(name)) {
					value = source[name];
					target[name] = value && ((typeof value === 'object' && args.deep) ?
						copy({
							sources: [value],
							deep: true,
							inherited: args.inherited,
							assignPrototype: args.assignPrototype
						}) : value);
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

export function getPropertyNames(object: {}): string[] {
	var setOfNames: {[index: string]: any} = {};
	var names : string[];
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
	} while (object);
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
		typeof a === 'number' && isNaN(a) &&
		typeof b === 'number' && isNaN(b);
}

export function lateBind(
	instance: {},
	method: string,
	...suppliedArgs: any[]
): (...args: any[]) => any {
	return function () {
		var args: any[] = !arguments.length ? suppliedArgs : suppliedArgs.concat(slice.call(arguments));

		// TS7017
		return (<any> instance)[method].apply(instance, args);
	};
}
