import Promise from '@dojo/shim/Promise';
import { Thenable } from '@dojo/interfaces/shim';
import { Observable } from '@dojo/core/Observable';
import global from '@dojo/core/global';
import { StoreObservable } from '../interfaces';

global.Rx = { config: { Promise } };

export default function createStoreObservable<T, U>(observable: Observable<U>, transform: (data: U) => T[]): StoreObservable<T, U> {
	// Cast to any because the signatures of catch between the Observable and Promise interfaces are not
	// compatible
	const storeObservable: StoreObservable<T, U> = <any> observable;
	storeObservable.then = function<V>(onFulfilled?: ((value: T[]) => (V | Thenable<V> | undefined)) | undefined, onRejected?: (reason?: Error) => void): Promise<V> {
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
