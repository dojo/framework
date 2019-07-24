import { Handle } from './Destroyable';
import { DNode, RenderResult } from './interfaces';
import { isWNode, isVNode } from './vdom';

const slice = Array.prototype.slice;
const hasOwnProperty = Object.prototype.hasOwnProperty;

export interface Modifier<T extends DNode> {
	(dNode: T, breaker: () => void): void;
}

export interface Predicate<T extends DNode> {
	(dNode: DNode): dNode is T;
}

export interface DecorateOptions<T extends DNode> {
	modifier: Modifier<T>;
	predicate?: Predicate<T>;
	shallow?: boolean;
}

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
	return array.map(function(item: T): T {
		if (Array.isArray(item)) {
			return copyArray(item, inherited) as any;
		}

		return !shouldDeepCopyObject(item)
			? item
			: _mixin({
					deep: true,
					inherited: inherited,
					sources: <Array<T>>[item],
					target: <T>{}
			  });
	});
}

interface MixinArgs<T extends {}, U extends {}> {
	deep: boolean;
	inherited: boolean;
	sources: (U | null | undefined)[];
	target: T;
	copied?: any[];
}

function _mixin<T extends {}, U extends {}>(kwArgs: MixinArgs<T, U>): T & U {
	const deep = kwArgs.deep;
	const inherited = kwArgs.inherited;
	const target: any = kwArgs.target;
	const copied = kwArgs.copied || [];
	const copiedClone = [...copied];

	for (let i = 0; i < kwArgs.sources.length; i++) {
		const source = kwArgs.sources[i];

		if (source === null || source === undefined) {
			continue;
		}
		for (let key in source) {
			if (inherited || hasOwnProperty.call(source, key)) {
				let value: any = source[key];

				if (copiedClone.indexOf(value) !== -1) {
					continue;
				}

				if (deep) {
					if (Array.isArray(value)) {
						value = copyArray(value, inherited);
					} else if (shouldDeepCopyObject(value)) {
						const targetValue: any = target[key] || {};
						copied.push(source);
						value = _mixin({
							deep: true,
							inherited: inherited,
							sources: [value],
							target: targetValue,
							copied
						});
					}
				}
				target[key] = value;
			}
		}
	}

	return <T & U>target;
}

/**
 * Copies the values of all enumerable own properties of one or more source objects to the target object,
 * recursively copying all nested objects and arrays as well.
 *
 * @param target The target object to receive values from source objects
 * @param sources Any number of objects whose enumerable own properties will be copied to the target object
 * @return The modified target object
 */
export function deepAssign<
	T extends {},
	U extends {},
	V extends {},
	W extends {},
	X extends {},
	Y extends {},
	Z extends {}
>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y, source6: Z): T & U & V & W & X & Y & Z;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X,
	source5: Y
): T & U & V & W & X & Y;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X
): T & U & V & W & X;
export function deepAssign<T extends {}, U extends {}, V extends {}, W extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W
): T & U & V & W;
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
export function deepMixin<
	T extends {},
	U extends {},
	V extends {},
	W extends {},
	X extends {},
	Y extends {},
	Z extends {}
>(target: T, source1: U, source2: V, source3: W, source4: X, source5: Y, source6: Z): T & U & V & W & X & Y & Z;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X,
	source5: Y
): T & U & V & W & X & Y;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X
): T & U & V & W & X;
export function deepMixin<T extends {}, U extends {}, V extends {}, W extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W
): T & U & V & W;
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
 * Copies the values of all enumerable (own or inherited) properties of one or more source objects to the
 * target object.
 *
 * @return The modified target object
 */
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}, Z extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X,
	source5: Y,
	source6: Z
): T & U & V & W & X & Y & Z;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}, Y extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X,
	source5: Y
): T & U & V & W & X & Y;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}, X extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W,
	source4: X
): T & U & V & W & X;
export function mixin<T extends {}, U extends {}, V extends {}, W extends {}>(
	target: T,
	source1: U,
	source2: V,
	source3: W
): T & U & V & W;
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
	return function(this: any) {
		const args: any[] = arguments.length ? suppliedArgs.concat(slice.call(arguments)) : suppliedArgs;

		return targetFunction.apply(this, args);
	};
}

export function guaranteeMinimumTimeout(callback: (...args: any[]) => void, delay?: number): Handle {
	const startTime = Date.now();
	let timerId: any;

	function timeoutHandler() {
		const delta = Date.now() - startTime;
		if (delay == null || delta >= delay) {
			callback();
		} else {
			timerId = setTimeout(timeoutHandler, delay - delta);
		}
	}
	timerId = setTimeout(timeoutHandler, delay);
	return {
		destroy: () => {
			if (timerId != null) {
				clearTimeout(timerId);
				timerId = null;
			}
		}
	};
}

export function debounce<T extends (this: any, ...args: any[]) => void>(callback: T, delay: number): T {
	let timer: Handle | null;

	return <T>function() {
		timer && timer.destroy();

		let context = this;
		let args: any | null = arguments;

		timer = guaranteeMinimumTimeout(function() {
			callback.apply(context, args);
			args = context = timer = null;
		}, delay);
	};
}

export function throttle<T extends (this: any, ...args: any[]) => void>(callback: T, delay: number): T {
	let ran: boolean | null;

	return <T>function() {
		if (ran) {
			return;
		}

		ran = true;
		let args: any | null = arguments;

		callback.apply(this, args);
		guaranteeMinimumTimeout(function() {
			ran = null;
		}, delay);
	};
}

export function uuid(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes. A `breaker` function is passed to the
 * modifier which will drain the nodes array and exit the decoration.
 *
 * When the `shallow` options is set to `true` the only the top node or nodes will be decorated (only supported using
 * `DecorateOptions`).
 */
export function decorate<T extends DNode>(dNodes: DNode, options: DecorateOptions<T>): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], options: DecorateOptions<T>): DNode[];
export function decorate<T extends DNode>(dNodes: DNode | DNode[], options: DecorateOptions<T>): DNode | DNode[];
export function decorate<T extends DNode>(dNodes: DNode, modifier: Modifier<T>, predicate: Predicate<T>): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], modifier: Modifier<T>, predicate: Predicate<T>): DNode[];
export function decorate<T extends DNode>(
	dNodes: RenderResult,
	modifier: Modifier<T>,
	predicate: Predicate<T>
): RenderResult;
export function decorate(dNodes: DNode, modifier: Modifier<DNode>): DNode;
export function decorate(dNodes: DNode[], modifier: Modifier<DNode>): DNode[];
export function decorate(dNodes: RenderResult, modifier: Modifier<DNode>): RenderResult;
export function decorate(
	dNodes: DNode | DNode[],
	optionsOrModifier: Modifier<DNode> | DecorateOptions<DNode>,
	predicate?: Predicate<DNode>
): DNode | DNode[] {
	let shallow = false;
	let modifier;
	if (typeof optionsOrModifier === 'function') {
		modifier = optionsOrModifier;
	} else {
		modifier = optionsOrModifier.modifier;
		predicate = optionsOrModifier.predicate;
		shallow = optionsOrModifier.shallow || false;
	}

	let nodes = Array.isArray(dNodes) ? [...dNodes] : [dNodes];
	function breaker() {
		nodes = [];
	}
	while (nodes.length) {
		const node = nodes.shift();
		if (node && node !== true) {
			if (!shallow && (isWNode(node) || isVNode(node)) && node.children) {
				nodes = [...nodes, ...node.children];
			}
			if (!predicate || predicate(node)) {
				modifier(node, breaker);
			}
		}
	}
	return dNodes;
}
