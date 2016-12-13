import ObservableShim, { ObservableObject, Subscribable, SubscriptionObserver } from 'dojo-shim/Observable';
import Promise from 'dojo-shim/Promise';
import { Iterable } from 'dojo-shim/iterator';

function isSubscribable(object: any): object is Subscribable<any> {
	return object && object.subscribe !== undefined;
}

export default class Observable<T> extends ObservableShim<T> {

	static of<T>(...items: T[]): Observable<T> {
		return <Observable<T>> super.of(...items);
	}

	static from<T>(item: Iterable<T> | ArrayLike<T> | ObservableObject): Observable<T> {
		return <Observable<T>> super.from(item);
	}

	static defer<T>(deferFunction: () => Subscribable<T>): Observable<T> {
		return new Observable<T>(observer => {
				const trueObservable = deferFunction();

				return trueObservable.subscribe({
					next(value: T) {
						return observer.next(value);
					},
					error(errorValue ?: any) {
						return observer.error(errorValue);
					},
					complete(completeValue ?: any) {
						observer.complete(completeValue);
					}
				});
			}
		);
	}

	toPromise(): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.subscribe({
				next(value: T) {
					resolve(value);
				},
				error(error: any) {
					reject(error);
				}
			});
		});
	}

	map<U>(mapFunction: (x: T) => U): Observable<U> {
		const self = this;

		if (typeof mapFunction !== 'function') {
			throw new TypeError('Map parameter must be a function');
		}

		return new Observable<U>((observer: SubscriptionObserver<U>) => {
			self.subscribe({
				next(value: T) {
					try {
						const result: U = mapFunction(value);
						return observer.next(result);
					}
					catch (e) {
						return observer.error(e);
					}
				},
				error(errorValue?: any) {
					return observer.error(errorValue);
				},
				complete(completeValue?: any) {
					return observer.complete(completeValue);
				}
			});
		});
	}

	filter(filterFunction: (x: T) => boolean): Observable<T> {
		const self = this;

		if (typeof filterFunction !== 'function') {
			throw new TypeError('Filter argument must be a function');
		}

		return new Observable<T>((observer: SubscriptionObserver<T>) => {
			self.subscribe({
				next(value: T) {
					try {
						if (filterFunction(value)) {
							return observer.next(value);
						}
					}
					catch (e) {
						return observer.error(e);
					}
				},
				error(errorValue?: any) {
					return observer.error(errorValue);
				},
				complete(completeValue?: any) {
					return observer.complete(completeValue);
				}
			});
		});
	}

	toArray(): Observable<T[]> {
		const self = this;

		return new Observable<T[]>(observer => {
			const values: T[] = [];

			self.subscribe({
				next(value: T) {
					values.push(value);
				},
				error(errorValue?: any) {
					return observer.error(errorValue);
				},
				complete(completeValue?: any) {
					observer.next(values);
					observer.complete(completeValue);
				}
			});
		});
	}

	mergeAll(concurrent: number): Observable<any> {
		const self = this;

		return new Observable<Observable<any>>((observer) => {
			let active: any[] = [];
			let queue: any[] = [];

			function checkForComplete() {
				if (active.length === 0 && queue.length === 0) {
					observer.complete();
				}
				else if (queue.length > 0 && active.length < concurrent) {
					const item = queue.shift();

					if (isSubscribable(item)) {
						const itemIndex = active.length;
						active.push(item);

						item.subscribe({
							next(value: any) {
								observer.next(value);
							},
							complete() {
								active.splice(itemIndex, 1);
								checkForComplete();
							}
						});
					}
					else {
						observer.next(item);
						checkForComplete();
					}
				}
			}

			self.subscribe({
				next(value: T) {
					queue.push(value);
				},
				complete() {
					checkForComplete();
				}
			});
		});
	}
}

// for convienence, re-export some interfaces from shim
export {
	Observable,
	Subscribable,
	SubscriptionObserver as Observer
}
