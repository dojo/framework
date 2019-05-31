import global from './global';
import { isArrayLike, isIterable, Iterable } from './iterator';
import has from '../core/has';
import './Symbol';

export interface Observable<T> extends ObservableObject {
	/**
	 * Registers handlers for handling emitted values, error and completions from the observable, and
	 * executes the observable's subscriber function, which will take action to set up the underlying data stream.
	 *
	 * @param observer    The observer object that will handle events
	 *
	 * @return A Subscription object that can be used to manage the subscription.
	 */
	subscribe(observer: Observer<T>): Subscription;

	/**
	 * Registers handlers for handling emitted values, error and completions from the observable, and
	 * executes the observable's subscriber function, which will take action to set up the underlying data stream.
	 *
	 * @param onNext A function to handle an emitted value. Value is passed in as the first parameter to the function.
	 * @param onError A function to handle errors that occur during onNext, or during subscription.
	 * @param onComplete A function that gets called when the subscription is complete, and will not send any more values. This function will also get called if an error occurs and onError is not defined.
	 *
	 * @return {Subscription} A Subscription object that can be used to manage the subscription.
	 */
	subscribe(
		onNext: (value: T) => any,
		onError?: (error: any) => any,
		onComplete?: (completeValue?: any) => void
	): Subscription;

	[Symbol.observable](): this;
}

export interface ObservableConstructor {
	/**
	 * Create a new observerable with a subscriber function. The subscriber function will get called with a
	 * SubscriptionObserver parameter for controlling the subscription.  I a function is returned, it will be
	 * run when the subscription is complete.
	 *
	 * @param subscriber The subscription function to be called when observers are subscribed
	 *
	 * @example
	 * ```ts
	 * const source = new Observer<number>((observer) => {
	 *     observer.next(1);
	 *     observer.next(2);
	 *     observer.next(3);
	 * });
	 * ```ts
	 */
	new <T>(subscriber: Subscriber<T>): Observable<T>;

	/**
	 * Create an Observable from another object. If the object is in itself Observable, the object will be returned.
	 * Otherwise, the value will be wrapped in an Observable. If the object is iterable, an Observable will be created
	 * that emits each item of the iterable.
	 *
	 * @param item The item to be turned into an Observable
	 * @return An observable for the item you passed in
	 */
	from<T>(item: Iterable<T> | ArrayLike<T> | ObservableObject): Observable<T>;

	/**
	 * Create an Observable from a list of values.
	 *
	 * @param items The values to be emitted
	 * @return An Observable that will emit the specified values
	 *
	 * @example
	 * ```ts
	 * let source = Observable.of(1, 2, 3);
	 * // will emit three separate values, 1, 2, and 3.
	 * ```
	 */
	of<T>(...items: T[]): Observable<T>;
}

/**
 * An object that implements a Symbol.observerable method.
 */
export interface ObservableObject {
	[Symbol.observable]: () => any;
}

/**
 * Handles events emitted from the subscription
 */
export interface Observer<T> {
	/**
	 * Called to handle a single emitted event.
	 *
	 * @param value The value that was emitted.
	 */
	next?(value: T): any;

	/**
	 * An optional method to be called when the subscription starts (before any events are emitted).
	 * @param observer
	 */
	start?(observer: Subscription): void;

	/**
	 * An optional method to be called if an error occurs during subscription or handling.
	 *
	 * @param errorValue The error
	 */
	error?(errorValue: any): any;

	/**
	 * An optional method to be called when the subscription is completed (unless an error occurred and the error method was specified)
	 *
	 * @param completeValue The value passed to the completion method.
	 */
	complete?(completeValue?: any): void;
}

/**
 * Describes an object that can be subscribed to
 */
export interface Subscribable<T> {
	subscribe(observer: Observer<T>): Subscription;
	subscribe(
		onNext: (value: T) => any,
		onError?: (error: any) => any,
		onComplete?: (completeValue?: any) => void
	): Subscription;
}

export interface Subscriber<T> {
	(observer: SubscriptionObserver<T>): (() => void) | void | { unsubscribe: () => void };
}

/**
 * Handles an individual subscription to an Observable.
 */
export interface Subscription {
	/**
	 * Whether or not the subscription is closed. Closed subscriptions will not emit values.
	 */
	closed: boolean;

	/**
	 * A function to call to close the subscription. Calling this will call any associated tear down methods.
	 */
	unsubscribe: (() => void);
}

/**
 * An object used to control a single subscription and an observer.
 */
export interface SubscriptionObserver<T> {
	/**
	 * Whether or not the subscription is closed.
	 */
	readonly closed: boolean;

	/**
	 * Emit an event to the observer.
	 *
	 * @param value The value to be emitted.
	 */
	next(value: T): any;

	/**
	 * Report an error. The subscription will be closed after an error has occurred.
	 *
	 * @param errorValue The error to be reported.
	 */
	error(errorValue: any): any;

	/**
	 * Report completion of the subscription. The subscription will be closed, and no new values will be emitted,
	 * after completion.
	 *
	 * @param completeValue A value to pass to the completion handler.
	 */
	complete(completeValue?: any): void;
}

export let Observable: ObservableConstructor = global.Observable;

if (!has('es-observable')) {
	/*
	 * Create a subscription observer for a given observer, and return the subscription.  The "logic" for Observerables
	 * is in here!
	 */
	const startSubscription = function startSubscription<T>(
		executor: Subscriber<T>,
		observer: Observer<T>
	): Subscription {
		let closed = false;
		let cleanUp: () => void | undefined;

		function unsubscribe() {
			if (!closed) {
				closed = true;

				if (cleanUp) {
					cleanUp();
				}
			}
		}

		function start(subscriptionObserver: SubscriptionObserver<T>) {
			if (observer.start) {
				observer.start(subscription);
			}

			if (closed) {
				return;
			}

			try {
				const result: any = executor(subscriptionObserver);

				if (typeof result === 'function') {
					cleanUp = result;
				} else if (result && 'unsubscribe' in result) {
					cleanUp = result.unsubscribe;
				} else if (result !== undefined && result !== null) {
					throw new TypeError('Subscriber must return a callable or subscription');
				}

				if (closed) {
					if (cleanUp) {
						cleanUp();
					}
				}
			} catch (e) {
				error(e);
			}
		}

		function next(value: T): any {
			if (closed) {
				return;
			}

			const next = observer.next;

			try {
				if (typeof next === 'function') {
					return next(value);
				} else if (next !== undefined && next !== null) {
					throw new TypeError('Observer.next is not a function');
				}
			} catch (e) {
				error(e);
			}
		}

		function error(errorValue?: any): any {
			if (!closed) {
				let cleanUpError: Error | undefined = undefined;

				try {
					unsubscribe();
				} catch (e) {
					cleanUpError = e;
				}

				const observerError = observer.error;

				if (observerError !== undefined && observerError !== null) {
					if (typeof observerError === 'function') {
						const errorResult = observerError(errorValue);

						if (cleanUpError !== undefined) {
							throw cleanUpError;
						}

						return errorResult;
					} else {
						throw new TypeError('Observer.error is not a function');
					}
				} else if (observer.complete) {
					return observer.complete(errorValue);
				} else {
					throw errorValue;
				}
			} else {
				throw errorValue;
			}
		}

		function complete(completeValue?: any): any {
			if (!closed) {
				let cleanUpError: Error | undefined = undefined;

				try {
					unsubscribe();
				} catch (e) {
					cleanUpError = e;
				}

				const observerComplete = observer.complete;

				if (observerComplete !== undefined && observerComplete !== null) {
					if (typeof observerComplete === 'function') {
						const completeResult = observerComplete(completeValue);

						if (cleanUpError !== undefined) {
							throw cleanUpError;
						}

						return completeResult;
					} else {
						throw new TypeError('Observer.complete is not a function');
					}
				} else if (cleanUpError) {
					throw cleanUpError;
				}
			}
		}

		const subscription = Object.create(
			Object.create(
				{},
				{
					closed: {
						enumerable: false,
						configurable: true,
						get() {
							return closed;
						}
					},
					unsubscribe: {
						enumerable: false,
						configurable: true,
						writable: true,
						value: unsubscribe
					}
				}
			)
		);

		const prototype = Object.create(
			{},
			{
				next: {
					enumerable: false,
					writable: true,
					value: next,
					configurable: true
				},
				error: {
					enumerable: false,
					writable: true,
					value: error,
					configurable: true
				},
				complete: {
					enumerable: false,
					writable: true,
					value: complete,
					configurable: true
				},
				closed: {
					enumerable: false,
					configurable: true,
					get() {
						return closed;
					}
				}
			}
		);

		// create the SubscriptionObserver and kick things off
		start(Object.create(prototype));

		// the ONLY way to control the SubscriptionObserver is with the subscription or from a subscriber
		return subscription;
	};

	Observable = (function() {
		function nonEnumerable(target: any, key: string | symbol, descriptor: PropertyDescriptor) {
			descriptor.enumerable = false;
		}

		class Observable<T> {
			private _executor: Subscriber<T>;

			@nonEnumerable
			[Symbol.observable](): this {
				return this;
			}

			constructor(subscriber: Subscriber<T>) {
				if (typeof subscriber !== 'function') {
					throw new TypeError('subscriber is not a function');
				}

				this._executor = subscriber;
			}

			@nonEnumerable
			subscribe(observerOrNext: any, ...listeners: any[]) {
				const [onError, onComplete] = [...listeners];

				if (
					!observerOrNext ||
					typeof observerOrNext === 'number' ||
					typeof observerOrNext === 'string' ||
					typeof observerOrNext === 'boolean'
				) {
					throw new TypeError('parameter must be a function or an observer');
				}

				let observer: Observer<T>;

				if (typeof observerOrNext === 'function') {
					observer = {
						next: observerOrNext
					};

					if (typeof onError === 'function') {
						observer.error = onError;
					}

					if (typeof onComplete === 'function') {
						observer.complete = onComplete;
					}
				} else {
					observer = observerOrNext;
				}

				return startSubscription(this._executor, observer);
			}

			@nonEnumerable
			static of<U>(...items: U[]): Observable<U> {
				let constructor: typeof Observable;

				if (typeof this !== 'function') {
					constructor = Observable;
				} else {
					constructor = this;
				}

				return new constructor((observer: SubscriptionObserver<U>) => {
					for (const o of items) {
						observer.next(o);
					}
					observer.complete();
				});
			}

			@nonEnumerable
			static from<U>(item: Iterable<U> | ArrayLike<U> | Observable<U>): Observable<U> {
				if (item === null || item === undefined) {
					throw new TypeError('item cannot be null or undefined');
				}

				let constructor: typeof Observable;

				if (typeof this !== 'function') {
					constructor = Observable;
				} else {
					constructor = this;
				}

				const observableSymbol = (item as Observable<U>)[Symbol.observable];

				if (observableSymbol !== undefined) {
					if (typeof observableSymbol !== 'function') {
						throw new TypeError('Symbol.observable must be a function');
					}

					const result: any = observableSymbol.call(item);

					if (
						result === undefined ||
						result === null ||
						typeof result === 'number' ||
						typeof result === 'boolean' ||
						typeof result === 'string'
					) {
						throw new TypeError('Return value of Symbol.observable must be object');
					}

					if ((result.constructor && result.constructor === this) || result instanceof Observable) {
						return result;
					} else if (result.subscribe) {
						return new constructor(result.subscribe);
					} else {
						if (constructor.of) {
							return constructor.of(result);
						} else {
							return Observable.of(result);
						}
					}
				} else if (isIterable(item) || isArrayLike(item)) {
					return new constructor((observer: SubscriptionObserver<U>) => {
						if (isArrayLike(item)) {
							for (let i = 0; i < item.length; i++) {
								observer.next(item[i]);
							}
						} else {
							for (const o of item) {
								observer.next(o);
							}
						}
						observer.complete();
					});
				} else {
					throw new TypeError('Parameter is neither Observable nor Iterable');
				}
			}
		}
		return Observable;
	})();
}

export default Observable;
