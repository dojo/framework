import has from './has';
import { Handle } from './interfaces';

const slice = Array.prototype.slice;
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Type guard that ensures that the value can be coerced to Object
 * to weed out host objects that do not derive from Object.
 * This function is used to check if we want to deep copy an object or not.
 * Note: In ES6 it is possible to modify an object's Symbol.toStringTag property, which will
 * change the value returned by `toString`. This is a rare edge case that is difficult to handle,
 * so it is not handled here.
 * @param  value The value to check
 * @return       If the value is coercible into an Object
 */
function shouldDeepCopyObject(value: any): value is Object {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function copyArray<T>(array: T[], inherited: boolean): T[] {
	return array.map(function (item: T): T {
		if (Array.isArray(item)) {
			return  <any> copyArray(<any> item, inherited);
		}

		return !shouldDeepCopyObject(item) ?
			item :
			_mixin({
				deep: true,
				inherited: inherited,
				sources: <Array<T>> [ item ],
				target: <T> {}
			});
	});
}

interface MixinArgs<T extends {}, U extends {}> {
	deep: boolean;
	inherited: boolean;
	sources: U[];
	target: T;
}

function _mixin<T extends {}, U extends {}>(kwArgs: MixinArgs<T, U>): T&U {
	const deep = kwArgs.deep;
	const inherited = kwArgs.inherited;
	const target = kwArgs.target;

	for (let source of kwArgs.sources) {
		for (let key in source) {
			if (inherited || hasOwnProperty.call(source, key)) {
				let value: any = (<any> source)[key];

				if (deep) {
					if (Array.isArray(value)) {
						value = copyArray(value, inherited);
					}
					else if (shouldDeepCopyObject(value)) {
						value = _mixin({
							deep: true,
							inherited: inherited,
							sources: <U[]> [ value ],
							target: {}
						});
					}
				}

				(<any> target)[key] = value;
			}
		}
	}

	return <T&U> target;
}

interface ObjectAssignConstructor extends ObjectConstructor {
	assign<T extends {}, U extends {}>(target: T, ...sources: U[]): T&U;
}

/**
 * Copies the values of all enumerable own properties of one or more source objects to the target object.
 *
 * @param target The target object to receive values from source objects
 * @param sources Any number of objects whose enumerable own properties will be copied to the target object
 * @return The modified target object
 */
export const assign = has('object-assign') ?
	(<ObjectAssignConstructor> Object).assign :
	function<T extends {}, U extends {}> (target: T, ...sources: U[]): T&U {
		return _mixin({
			deep: false,
			inherited: false,
			sources: sources,
			target: target
		});
	};

/**
 * Creates a new object from the given prototype, and copies all enumerable own properties of one or more
 * source objects to the newly created target object.
 *
 * @param prototype The prototype to create a new object from
 * @param mixins Any number of objects whose enumerable own properties will be copied to the created object
 * @return The new object
 */
export function create<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}, Z extends {}>(prototype: T, mixin1: U, mixin2: V, mixin3: W, mixin4: X, mixin5: Y, mixin6: Z): T & U & V & W & X & Y & Z;
export function create<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(prototype: T, mixin1: U, mixin2: V, mixin3: W, mixin4: X, mixin5: Y): T & U & V & W & X & Y;
export function create<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(prototype: T, mixin1: U, mixin2: V, mixin3: W, mixin4: X): T & U & V & W & X;
export function create<T extends {}, U extends {}, V extends {}, W extends {}>(prototype: T, mixin1: U, mixin2: V, mixin3: W): T & U & V & W;
export function create<T extends {}, U extends {}, V extends {}>(prototype: T, mixin1: U, mixin2: V): T & U & V;
export function create<T extends {}, U extends {}>(prototype: T, mixin: U): T & U;
export function create<T extends {}>(prototype: T): T;
export function create(prototype: any, ...mixins: any[]): any {
	if (!mixins.length) {
		throw new RangeError('lang.create requires at least one mixin object.');
	}

	const args = mixins.slice();
	args.unshift(Object.create(prototype));

	return assign.apply(null, args);
}

/**
 * Copies the values of all enumerable own properties of one or more source objects to the target object,
 * recursively copying all nested objects and arrays as well.
 *
 * @param target The target object to receive values from source objects
 * @param sources Any number of objects whose enumerable own properties will be copied to the target object
 * @return The modified target object
 */
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}, Z extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y, source6: Z): T & U & V & W & X & Y & Z;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y): T & U & V & W & X & Y;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(target: T, source1: U, source2: V, source3: W, source4: X): T & U & V & W & X;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
export function deepAssign<T extends {}, U extends {}, V extends {}>(target: T, source1: U, source2: V): T & U & V;
export function deepAssign<T extends {}, U extends {}>(target: T, source: U): T & U;
export function deepAssign(target: any, ...sources: any[]): any {
	return _mixin({
		deep: true,
		inherited: false,
		sources: sources,
		target: target
	});
}

/**
 * Copies the values of all enumerable (own or inherited) properties of one or more source objects to the
 * target object, recursively copying all nested objects and arrays as well.
 *
 * @param target The target object to receive values from source objects
 * @param sources Any number of objects whose enumerable properties will be copied to the target object
 * @return The modified target object
 */
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}, Z extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y, source6: Z): T & U & V & W & X & Y & Z;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y): T & U & V & W & X & Y;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(target: T, source1: U, source2: V, source3: W, source4: X): T & U & V & W & X;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
export function deepMixin<T extends {}, U extends {}, V extends {}>(target: T, source1: U, source2: V): T & U & V;
export function deepMixin<T extends {}, U extends {}>(target: T, source: U): T & U;
export function deepMixin(target: any, ...sources: any[]): any {
	return _mixin({
		deep: true,
		inherited: true,
		sources: sources,
		target: target
	});
}

/**
 * Creates a new object using the provided source's prototype as the prototype for the new object, and then
 * deep copies the provided source's values into the new target.
 *
 * @param source The object to duplicate
 * @return The new object
 */
export function duplicate<T extends {}>(source: T): T {
	const target = Object.create(Object.getPrototypeOf(source));

	return deepMixin(target, source);
}

/**
 * Determines whether two values are the same value.
 *
 * @param a First value to compare
 * @param b Second value to compare
 * @return true if the values are the same; false otherwise
 */
export function isIdentical(a: any, b: any): boolean {
	return a === b ||
		/* both values are NaN */
		(a !== a && b !== b);
}

/**
 * Returns a function that binds a method to the specified object at runtime. This is similar to
 * `Function.prototype.bind`, but instead of a function it takes the name of a method on an object.
 * As a result, the function returned by `lateBind` will always call the function currently assigned to
 * the specified property on the object as of the moment the function it returns is called.
 *
 * @param instance The context object
 * @param method The name of the method on the context object to bind to itself
 * @param suppliedArgs An optional array of values to prepend to the `instance[method]` arguments list
 * @return The bound function
 */
export function lateBind(instance: {}, method: string, ...suppliedArgs: any[]): (...args: any[]) => any {
	return suppliedArgs.length ?
		function () {
			const args: any[] = arguments.length ? suppliedArgs.concat(slice.call(arguments)) : suppliedArgs;

			// TS7017
			return (<any> instance)[method].apply(instance, args);
		} :
		function () {
			// TS7017
			return (<any> instance)[method].apply(instance, arguments);
		};
}

/**
 * Copies the values of all enumerable (own or inherited) properties of one or more source objects to the
 * target object.
 *
 * @return The modified target object
 */
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}, Z extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y, source6: Z): T & U & V & W & X & Y & Z;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y): T & U & V & W & X & Y;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(target: T, source1: U, source2: V, source3: W, source4: X): T & U & V & W & X;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
export function mixin<T extends {}, U extends {}, V extends {}>(target: T, source1: U, source2: V): T & U & V;
export function mixin<T extends {}, U extends {}>(target: T, source: U): T & U;
export function mixin(target: any, ...sources: any[]): any {
	return _mixin({
		deep: false,
		inherited: true,
		sources: sources,
		target: target
	});
}

/**
 * Returns a function which invokes the given function with the given arguments prepended to its argument list.
 * Like `Function.prototype.bind`, but does not alter execution context.
 *
 * @param targetFunction The function that needs to be bound
 * @param suppliedArgs An optional array of arguments to prepend to the `targetFunction` arguments list
 * @return The bound function
 */
export function partial(targetFunction: (...args: any[]) => any, ...suppliedArgs: any[]): (...args: any[]) => any {
	return function () {
		const args: any[] = arguments.length ? suppliedArgs.concat(slice.call(arguments)) : suppliedArgs;

		return targetFunction.apply(this, args);
	};
}

/**
 * Returns an object with a destroy method that, when called, calls the passed-in destructor.
 * This is intended to provide a unified interface for creating "remove" / "destroy" handlers for
 * event listeners, timers, etc.
 *
 * @param destructor A function that will be called when the handle's `destroy` method is invoked
 * @return The handle object
 */
export function createHandle(destructor: () => void): Handle {
	return {
		destroy: function () {
			this.destroy = function () {};
			destructor.call(this);
		}
	};
}

/**
 * Returns a single handle that can be used to destroy multiple handles simultaneously.
 *
 * @param handles An array of handles with `destroy` methods
 * @return The handle object
 */
export function createCompositeHandle(...handles: Handle[]): Handle {
	return createHandle(function () {
		for (let handle of handles) {
			handle.destroy();
		}
	});
}
