import { Handle } from '@dojo/interfaces/core';
import WeakMap from '@dojo/shim/WeakMap';
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

type AdviceType = 'before' | 'after' | 'around';

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

export interface JoinPointDispatchAdvice<T> {
	before?: JoinPointBeforeAdvice[];
	after?: JoinPointAfterAdvice<T>[];
	readonly joinPoint: Function;
}

export interface JoinPointAfterAdvice<T> {
	/**
	 * Advice which is applied *after*, receiving the result and arguments from the join point.
	 *
	 * @param result The result from the function being advised
	 * @param args The arguments that were supplied to the advised function
	 * @returns The value returned from the advice is then the result of calling the method
	 */
	(result: T, ...args: any[]): T;
}

export interface JoinPointAroundAdvice<T> {
	/**
	 * Advice which is applied *around*.  The advising function receives the original function and
	 * needs to return a new function which will then invoke the original function.
	 *
	 * @param origFn The original function
	 * @returns A new function which will invoke the original function.
	 */
	(origFn: GenericFunction<T>): (...args: any[]) => T;
}

export interface JoinPointBeforeAdvice {
	/**
	 * Advice which is applied *before*, receiving the original arguments, if the advising
	 * function returns a value, it is passed further along taking the place of the original
	 * arguments.
	 *
	 * @param args The arguments the method was called with
	 */
	(...args: any[]): any[] | void;
}

export interface GenericFunction<T> {
	(...args: any[]): T;
}

/**
 * A weak map of dispatchers used to apply the advice
 */
const dispatchAdviceMap = new WeakMap<Function, JoinPointDispatchAdvice<any>>();

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
function adviseObject(
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
 * Advise a join point (function) with supplied advice
 *
 * @param joinPoint The function to be advised
 * @param type The type of advice to be applied
 * @param advice The advice to apply
 */
function adviseJoinPoint<F extends GenericFunction<T>, T>(this: any, joinPoint: F, type: AdviceType, advice: JoinPointBeforeAdvice | JoinPointAfterAdvice<T> | JoinPointAroundAdvice<T>): F {
	let dispatcher: F;
	if (type === 'around') {
		dispatcher = getJoinPointDispatcher(advice.apply(this, [ joinPoint ]));
	}
	else {
		dispatcher = getJoinPointDispatcher(joinPoint);
		const adviceMap = dispatchAdviceMap.get(dispatcher);
		if (type === 'before') {
			(adviceMap.before || (adviceMap.before = [])).unshift(<JoinPointBeforeAdvice> advice);
		}
		else {
			(adviceMap.after || (adviceMap.after = [])).push(advice);
		}
	}
	return dispatcher;
}

/**
 * An internal function that resolves or creates the dispatcher for a given join point
 *
 * @param target The target object or map
 * @param methodName The name of the method that the dispatcher should be resolved for
 * @return The dispatcher
 */
function getDispatcherObject(target: Targetable, methodName: string): Dispatcher {
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
			while (after && after.id !== undefined && after.id < executionId) {
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
 * Returns the dispatcher function for a given joinPoint (method/function)
 *
 * @param joinPoint The function that is to be advised
 */
function getJoinPointDispatcher<F extends GenericFunction<T>, T>(joinPoint: F): F {

	function dispatcher(this: Function, ...args: any[]): T {
		const { before, after, joinPoint } = dispatchAdviceMap.get(dispatcher);
		if (before) {
			args = before.reduce((previousArgs, advice) => {
				const currentArgs = advice.apply(this, previousArgs);
				return currentArgs || previousArgs;
			}, args);
		}
		let result = joinPoint.apply(this, args);
		if (after) {
			result = after.reduce((previousResult, advice) => {
				return advice.apply(this, [ previousResult ].concat(args));
			}, result);
		}
		return result;
	}

	/* We want to "clone" the advice that has been applied already, if this
	 * joinPoint is already advised */
	if (dispatchAdviceMap.has(joinPoint)) {
		const adviceMap = dispatchAdviceMap.get(joinPoint);
		let { before, after } = adviceMap;
		if (before) {
			before = before.slice(0);
		}
		if (after) {
			after = after.slice(0);
		}
		dispatchAdviceMap.set(dispatcher, {
			joinPoint: adviceMap.joinPoint,
			before,
			after
		});
	}
	/* Otherwise, this is a new joinPoint, so we will create the advice map afresh */
	else {
		dispatchAdviceMap.set(dispatcher, { joinPoint });
	}

	return dispatcher as F;
}

/**
 * Apply advice *after* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The after advice
 */
function afterJoinPoint<F extends GenericFunction<T>, T>(joinPoint: F, advice: JoinPointAfterAdvice<T>): F {
	return adviseJoinPoint(joinPoint, 'after', advice);
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
function afterObject(target: Targetable, methodName: string, advice: (originalReturn: any, originalArgs: IArguments) => any): Handle {
	return adviseObject(getDispatcherObject(target, methodName), 'after', advice);
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
export function after(target: Targetable, methodName: string, advice: (originalReturn: any, originalArgs: IArguments) => any): Handle;
/**
 * Apply advice *after* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The after advice
 */
export function after<F extends GenericFunction<T>, T>(joinPoint: F, advice: JoinPointAfterAdvice<T>): F;
export function after<F extends GenericFunction<T>, T>(joinPointOrTarget: F | Targetable, methodNameOrAdvice: string | JoinPointAfterAdvice<T>, objectAdvice?: (originalReturn: any, originalArgs: IArguments) => any): Handle | F {
	if (typeof joinPointOrTarget === 'function') {
		return afterJoinPoint(joinPointOrTarget, <JoinPointAfterAdvice<T>> methodNameOrAdvice);
	}
	else {
		return afterObject(joinPointOrTarget, <string> methodNameOrAdvice, objectAdvice!);
	}
}

/**
 * Apply advice *around* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The around advice
 */
export function aroundJoinPoint<F extends GenericFunction<T>, T>(joinPoint: F, advice: JoinPointAroundAdvice<T>): F {
	return adviseJoinPoint<F, T>(joinPoint, 'around', advice);
}

/**
 * Attaches "around" advice around the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original function
 * @return A handle which will remove the aspect when destroy is called
 */
export function aroundObject(target: Targetable, methodName: string, advice: ((previous: Function) => Function)): Handle {
	let dispatcher: Dispatcher | undefined = getDispatcherObject(target, methodName);
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
 * Attaches "around" advice around the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original function
 * @return A handle which will remove the aspect when destroy is called
 */
export function around(target: Targetable, methodName: string, advice: ((previous: Function) => Function)): Handle;
/**
 * Apply advice *around* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The around advice
 */
export function around<F extends GenericFunction<T>, T>(joinPoint: F, advice: JoinPointAroundAdvice<T>): F;
export function around<F extends GenericFunction<T>, T>(joinPointOrTarget: F | Targetable, methodNameOrAdvice: string | JoinPointAroundAdvice<T>, objectAdvice?: ((previous: Function) => Function)): Handle | F {
	if (typeof joinPointOrTarget === 'function') {
		return aroundJoinPoint(joinPointOrTarget, <JoinPointAroundAdvice<T>> methodNameOrAdvice);
	}
	else {
		return aroundObject(joinPointOrTarget, <string> methodNameOrAdvice, objectAdvice!);
	}
}

/**
 * Apply advice *before* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The before advice
 */
export function beforeJoinPoint<F extends GenericFunction<any>>(joinPoint: F, advice: JoinPointBeforeAdvice): F {
	return adviseJoinPoint(joinPoint, 'before', advice);
}

/**
 * Attaches "before" advice to be executed before the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original, and may return new arguments
 * @return A handle which will remove the aspect when destroy is called
 */
export function beforeObject(target: Targetable, methodName: string, advice: (...originalArgs: any[]) => any[] | void): Handle {
	return adviseObject(getDispatcherObject(target, methodName), 'before', advice);
}

/**
 * Attaches "before" advice to be executed before the original method.
 *
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original, and may return new arguments
 * @return A handle which will remove the aspect when destroy is called
 */
export function before(target: Targetable, methodName: string, advice: (...originalArgs: any[]) => any[] | void): Handle;
/**
 * Apply advice *before* the supplied joinPoint (function)
 *
 * @param joinPoint A function that should have advice applied to
 * @param advice The before advice
 */
export function before<F extends GenericFunction<any>>(joinPoint: F, advice: JoinPointBeforeAdvice): F;
export function before<F extends GenericFunction<T>, T>(joinPointOrTarget: F | Targetable, methodNameOrAdvice: string | JoinPointBeforeAdvice, objectAdvice?: ((...originalArgs: any[]) => any[] | void)): Handle | F {
	if (typeof joinPointOrTarget === 'function') {
		return beforeJoinPoint(joinPointOrTarget, <JoinPointBeforeAdvice> methodNameOrAdvice);
	}
	else {
		return beforeObject(joinPointOrTarget, <string> methodNameOrAdvice, objectAdvice!);
	}
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
	return adviseObject(getDispatcherObject(target, methodName), 'after', advice, true);
}
