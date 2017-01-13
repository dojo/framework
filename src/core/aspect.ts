import { Handle } from '@dojo/interfaces/core';
import { createHandle } from './lang';

/**
 * An object that provides the necessary APIs to be MapLike
 */
export interface MapLike<K, V> {
	get(key: K): V;
	set(key: K, value?: V): this;
}

/**
 * An internal type guard that determines if an value is MapLike or not
 *
 * @param value The value to guard against
 */
function isMapLike(value: any): value is MapLike<any, any> {
	return value && typeof value.get === 'function' && typeof value.set === 'function';
}

export interface Indexable {
	[method: string]: any;
}

/**
 * The types of objects or maps where advice can be applied
 */
export type Targetable = MapLike<string, any> | Indexable;

type AdviceType = 'before' | 'after';

/**
 * A meta data structure when applying advice
 */
interface Advised {
	readonly id?: number;
	advice?: Function;
	previous?: Advised;
	next?: Advised;
	readonly receiveArguments?: boolean;
}

/**
 * A function that dispatches advice which is decorated with additional
 * meta data about the advice to apply
 */
interface Dispatcher {
	[ type: string ]: Advised | undefined;
	(): any;
	target: any;
	before?: Advised;
	around?: Advised;
	after?: Advised;
}

/**
 * A UID for tracking advice ordering
 */
let nextId = 0;

/**
 * Internal function that advises a join point
 *
 * @param dispatcher The current advice dispatcher
 * @param type The type of before or after advice to apply
 * @param advice The advice to apply
 * @param receiveArguments If true, the advice will receive the arguments passed to the join point
 * @return The handle that will remove the advice
 */
function advise(
	dispatcher: Dispatcher | undefined,
	type: AdviceType,
	advice: Function | undefined,
	receiveArguments?: boolean
): Handle {
	let previous = dispatcher && dispatcher[type];
	let advised: Advised | undefined = {
		id: nextId++,
		advice: advice,
		receiveArguments: receiveArguments
	};

	if (previous) {
		if (type === 'after') {
			// add the listener to the end of the list
			// note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
			while (previous.next && (previous = previous.next)) {}
			previous.next = advised;
			advised.previous = previous;
		}
		else {
			// add to the beginning
			if (dispatcher) {
				dispatcher.before = advised;
			}
			advised.next = previous;
			previous.previous = advised;
		}
	}
	else {
		dispatcher && (dispatcher[type] = advised);
	}

	advice = previous = undefined;

	return createHandle(function () {
		let { previous = undefined, next = undefined } = (advised || {});

		if (dispatcher && !previous && !next) {
			dispatcher[type] = undefined;
		}
		else {
			if (previous) {
				previous.next = next;
			}
			else {
				dispatcher && (dispatcher[type] = next);
			}

			if (next) {
				next.previous = previous;
			}
		}
		if (advised) {
			delete advised.advice;
		}
		dispatcher = advised = undefined;
	});
}

/**
 * An internal function that resolves or creates the dispatcher for a given join point
 *
 * @param target The target object or map
 * @param methodName The name of the method that the dispatcher should be resolved for
 * @return The dispatcher
 */
function getDispatcher(target: Targetable, methodName: string): Dispatcher {
	const existing = isMapLike(target) ? target.get(methodName) : target && target[methodName];
	let dispatcher: Dispatcher;

	if (!existing || existing.target !== target) {
		/* There is no existing dispatcher, therefore we will create one */
		dispatcher = <Dispatcher> function (this: Dispatcher): any {
			let executionId = nextId;
			let args = arguments;
			let results: any;
			let before = dispatcher.before;

			while (before) {
				if (before.advice) {
					args = before.advice.apply(this, args) || args;
				}
				before = before.next;
			}

			if (dispatcher.around && dispatcher.around.advice) {
				results = dispatcher.around.advice(this, args);
			}

			let after = dispatcher.after;
			while (after && after.id < executionId) {
				if (after.advice) {
					if (after.receiveArguments) {
						let newResults = after.advice.apply(this, args);
						results = newResults === undefined ? results : newResults;
					}
					else {
						results = after.advice.call(this, results, args);
					}
				}
				after = after.next;
			}

			return results;
		};

		if (isMapLike(target)) {
			target.set(methodName, dispatcher);
		}
		else {
			target && (target[methodName] = dispatcher);
		}

		if (existing) {
			dispatcher.around = {
				advice: function (target: any, args: any[]): any {
					return existing.apply(target, args);
				}
			};
		}

		dispatcher.target = target;
	}
	else {
		dispatcher = existing;
	}

	return dispatcher;
}

/**
 * Attaches "after" advice to be executed after the original method.
 * The advising function will receive the original method's return value and arguments object.
 * The value it returns will be returned from the method when it is called (even if the return value is undefined).
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original method's return value and arguments object
 * @return A handle which will remove the aspect when destroy is called
 */
export function after(target: Targetable, methodName: string, advice: (originalReturn: any, originalArgs: IArguments) => any): Handle {
	return advise(getDispatcher(target, methodName), 'after', advice);
}

/**
 * Attaches "around" advice around the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original function
 * @return A handle which will remove the aspect when destroy is called
 */
export function around(target: Targetable, methodName: string, advice: ((previous: Function) => Function)): Handle {
	let dispatcher: Dispatcher | undefined = getDispatcher(target, methodName);
	let previous = dispatcher.around;
	let advised: Function | undefined;
	if (advice) {
		advised = advice(function (this: Dispatcher): any {
			if (previous && previous.advice) {
				return previous.advice(this, arguments);
			}
		});
	}

	dispatcher.around = {
		advice: function (target: any, args: any[]): any {
			return advised ? advised.apply(target, args) : previous && previous.advice && previous.advice(target, args);
		}
	};

	return createHandle(function () {
		advised = dispatcher = undefined;
	});
}

/**
 * Attaches "before" advice to be executed before the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original, and may return new arguments
 * @return A handle which will remove the aspect when destroy is called
 */
export function before(target: Targetable, methodName: string, advice: (...originalArgs: any[]) => any[] | void): Handle {
	return advise(getDispatcher(target, methodName), 'before', advice);
}

/**
 * Attaches advice to be executed after the original method.
 * The advising function will receive the same arguments as the original method.
 * The value it returns will be returned from the method when it is called *unless* its return value is undefined.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original method
 * @return A handle which will remove the aspect when destroy is called
 */
export function on(target: Targetable, methodName: string, advice: (...originalArgs: any[]) => any): Handle {
	return advise(getDispatcher(target, methodName), 'after', advice, true);
}
