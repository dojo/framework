import { Handle } from './interfaces';
import { createHandle } from './lang';

interface Advised {
	id?: number;
	advice: Function | null;
	previous?: Advised | null;
	next?: Advised | null;
	receiveArguments?: boolean;
}

interface Dispatcher {
	(): any;
	target: any;
	before?: Advised | null;
	around?: Advised;
	after?: Advised | null;
}

let nextId = 0;

function advise(dispatcher: Dispatcher | null, type: string, advice: Function | null, receiveArguments?: boolean): Handle {
	let previous = (<any> dispatcher)[type];
	let advised: Advised | null = {
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
		(<any> dispatcher)[type] = advised;
	}

	advice = previous = null;

	return createHandle(function () {
		let previous = advised ? advised.previous : null;
		let next = advised ?  advised.next : null;

		if (!previous && !next) {
			(<any> dispatcher)[type] = null;
		}
		else {
			if (previous) {
				previous.next = next;
			}
			else {
				(<any> dispatcher)[type] = next;
			}

			if (next) {
				next.previous = previous;
			}
		}
		if (advised) {
			advised.advice = null;
		}
		dispatcher = advised = null;
	});
}

function getDispatcher(target: any, methodName: string): Dispatcher {
	const existing = target[methodName];
	let dispatcher: Dispatcher;

	if (!existing || existing.target !== target) {
		// no dispatcher
		target[methodName] = dispatcher = <Dispatcher> function (this: Dispatcher): any {
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

	target = null;

	return dispatcher;
}

/**
 * Attaches "after" advice to be executed after the original method.
 * The advising function will receive the original method's return value and arguments object.
 * The value it returns will be returned from the method when it is called (even if the return value is undefined).
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original method's return value and arguments object
 * @return A handle which will remove the aspect when destroy is called
 */
export function after(target: any, methodName: string, advice: (originalReturn: any, originalArgs: IArguments) => any): Handle {
	return advise(getDispatcher(target, methodName), 'after', advice);
}

/**
 * Attaches "around" advice around the original method.
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the original function
 * @return A handle which will remove the aspect when destroy is called
 */
export function around(target: any, methodName: string, advice: null | ((previous: Function) => Function)): Handle {
	let dispatcher: Dispatcher | null = getDispatcher(target, methodName);
	let previous = dispatcher.around;
	let advised: Function | null;
	if (advice) {
		advised = advice(function (this: Dispatcher): any {
			if (previous && previous.advice) {
				return previous.advice(this, arguments);
			}
		});
	}

	dispatcher.around = {
		advice: function (target: any, args: any[]): any {
			return advised ? advised.apply(target, args) : previous && previous.advice ? previous.advice(target, args) : null;
		}
	};

	advice = null;

	return createHandle(function () {
		advised = dispatcher = null;
	});
}

/**
 * Attaches "before" advice to be executed before the original method.
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original, and may return new arguments
 * @return A handle which will remove the aspect when destroy is called
 */
export function before(target: any, methodName: string, advice: (...originalArgs: any[]) => any[] | void): Handle {
	return advise(getDispatcher(target, methodName), 'before', advice);
}

/**
 * Attaches advice to be executed after the original method.
 * The advising function will receive the same arguments as the original method.
 * The value it returns will be returned from the method when it is called *unless* its return value is undefined.
 * @param target Object whose method will be aspected
 * @param methodName Name of method to aspect
 * @param advice Advising function which will receive the same arguments as the original method
 * @return A handle which will remove the aspect when destroy is called
 */
export function on(target: any, methodName: string, advice: (...originalArgs: any[]) => any): Handle {
	return advise(getDispatcher(target, methodName), 'after', advice, true);
}
