import Promise from 'dojo-shim/Promise';
import { Thenable } from 'dojo-interfaces/shim';
import { Subscribable, Observable } from 'rxjs/Observable';
import global from 'dojo-core/global';

global.Rx = { config: { Promise } };

/**
 * Adds a then method to the observable for those consumers of the store API who
 * only want to know about the end result of an operation, and don't want to deal with
 * any recoverable failures.
 */
export type StoreObservable<T, U> = Subscribable<U> & Promise<T[]>

export default function createStoreObservable<T, U>(observable: Observable<U>, transform: (data: U) => T[]): StoreObservable<T, U> {
	// Cast to any because the signatures of catch between the Observable and Promise interfaces are not
	// compatible
	const storeObservable: StoreObservable<T, U> = <any> observable;
	storeObservable.then = function<V>(onFulfilled?: ((value: T[]) => (V | Thenable<V> | null | undefined)) | undefined, onRejected?: (reason?: Error) => void): Promise<V> {
		// Wrap in a shim promise because the interface that leaks through observable.toPromise is missing some
		// properties on the shim(e.g. promise)
		return Promise.resolve(observable.toPromise())
			.then(transform)
			.then<V>(onFulfilled, onRejected);
	};

	storeObservable.catch = function<U>(onRejected: (reason: Error) => (U | Thenable<U>)): Promise<U> {
		return observable.toPromise().then(transform).then<U>(undefined, onRejected);
	};

	return storeObservable;
}
