import Promise from 'dojo-shim/Promise';
import { Observable } from 'rxjs/Rx';
import global from 'dojo-core/global';

global.Rx = { config: { Promise } };

/**
 * Adds a then method to the observable for those consumers of the store API who
 * only want to know about the end result of an operation, and don't want to deal with
 * any recoverable failures.
 */
export interface StoreObservable<T, U> extends Observable<U> {
	then<V>(onFulfilled?: ((value?: T[]) => (V | Promise<V> | null | undefined)) | null | undefined, onRejected?: (reason?: Error) => void): Promise<V>;
}

export default function createStoreObservable<T, U>(observable: Observable<U>, transform: (data: U) => T[]): StoreObservable<T, U> {
	const storeObservable = observable as StoreObservable<T, U>;
	storeObservable.then = function<V>(onFulfilled?: ((value?: T[]) => (V | Promise<V> | null | undefined)) | null | undefined, onRejected?: (reason?: Error) => void): Promise<V> {
		// Wrap in a shim promise because the interface that leaks through observable.toPromise is missing some
		// properties on the shim(e.g. promise)
		return Promise.resolve(storeObservable.toPromise()).then(function(result) {
			return transform(result);
		}).then<V>(onFulfilled, onRejected);
	};

	return storeObservable;
}
