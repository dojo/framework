import { UpdateResults } from '../../storage/createInMemoryStorage';
import { Store, CrudOptions, StoreOptions } from '../createStore';
import { ComposeMixinDescriptor } from 'dojo-compose/compose';
import WeakMap from 'dojo-shim/WeakMap';
import Promise from 'dojo-shim/Promise';
import { Observer, Observable } from 'rxjs/Rx';
import createStoreObservable from '../createStoreObservable';

interface OrderedOperationState {
	operationQueue: Function[];
	inProgress?: boolean;
}

const instanceStateMap = new WeakMap<{}, OrderedOperationState>();

function processNext(state: OrderedOperationState) {
	const operation = state.operationQueue.shift();
	if (!operation) {
		state.inProgress = false;
		return;
	}
	const promiseOrObservable = operation();
	if (promiseOrObservable.toPromise) {
		promiseOrObservable.subscribe(
			null,
			function() {
				processNext(state);
			},
			function() {
				processNext(state);
			}
		);
	}
	else if (promiseOrObservable.then) {
		promiseOrObservable.then(
			function() {
				processNext(state);
			},
			function() {
				processNext(state);
			});
	}
}
function queueStoreOperation(operation: Function, returnsPromise?: boolean) {
	return function(this: any, ...args: any[]) {
		const store = this;
		const state = instanceStateMap.get(store);
		if (!state || this.source) {
			return operation.apply(store, args);
		}
		if (!state.inProgress) {
			state.inProgress = true;
			setTimeout(function() {
				processNext(state);
			});
		}
		if (returnsPromise) {
			return new Promise(function(resolve, reject) {
				state.operationQueue.push(function() {
					return operation.apply(store, args).then(function(results: any) {
						resolve(results);
					}, function(error: any) {
						reject(error);
					});
				});
			});
		}
		else {
			let pushed = false;
			let observers: Observer<any>[] = [];
			let operationObservable: Observable<any>;
			const observable = createStoreObservable(
				new Observable(function subscribe(observer: Observer<{}>) {
					if (!operationObservable) {
						observers.push(observer);
					}
					if (!pushed) {
						state.operationQueue.push(function() {
							operationObservable = operation.apply(store, args);
							observers.forEach(function(observer) {
								operationObservable.subscribe(observer);
							});
							return operationObservable;
						});
						pushed = true;
					}

					return () => observers.splice(observers.indexOf(observer), 1);
				}),
				function(updateResults: UpdateResults<{}>) {
					return updateResults.successfulData;
				}
			);
			observable.subscribe();
			return observable;
		}
	};
}

function createOrderedOperationMixin<T, O extends CrudOptions, U extends UpdateResults<T>>(): ComposeMixinDescriptor<
	Store<T, O, U>, StoreOptions<T, O>, Store<T, O, U>, StoreOptions<T, O>
> {
	return {
		aspectAdvice: {
			around: {
				put(put: Function) {
					return queueStoreOperation(put);
				},

				add(add: Function) {
					return queueStoreOperation(add);
				},

				patch(patch: Function) {
					return queueStoreOperation(patch);
				},

				delete(_delete: Function) {
					return queueStoreOperation(_delete);
				},

				fetch(fetch: Function) {
					return queueStoreOperation(fetch, true);
				}
			}
		},
		initialize(instance: Store<T, O, U>) {
			instanceStateMap.set(instance, {
				operationQueue: []
			});
		}
	};
}

export default createOrderedOperationMixin;
