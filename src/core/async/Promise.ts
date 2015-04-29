import PlatformPromise, { isThenable, Thenable, Executor } from '../Promise';
export { Thenable } from '../Promise';

export default class Promise<T> extends PlatformPromise<T> {
	static all<T>(items: (T | Thenable<T>)[]): Promise<T[]> {
		return <Promise<T[]>> super.all<T>(items);
	}

	static race<T>(items: (T | Thenable<T>)[]): Promise<T> {
		return <Promise<T>> super.race<T>(items);
	}

	static reject<T>(reason: any): Promise<any> {
		return <Promise<any>> super.reject<T>(reason);
	}

	static resolve(): Promise<void>;
	static resolve<T>(value: (T | Thenable<T>)): Promise<T>;
	static resolve<T>(value?: any): Promise<T> {
		return <Promise<T>> super.resolve<T>(value);
	}

	protected static copy<U>(other: PlatformPromise<U>): Promise<U> {
		var promise = <Promise<U>> super.copy(other);

		if (other instanceof Promise && other._state !== State.Pending) {
			promise._state = other._state;
		}
		else {
			other.then(
				() => promise._state = State.Fulfilled,
				() => promise._state = State.Rejected
			);
		}
		return promise;
	}

	protected _state = State.Pending;

	constructor(executor: Executor<T>) {
		super(executor);
		super.then(
			() => this._state = State.Fulfilled,
			() => this._state = State.Rejected
		);
	}

	/**
	 * Allows for cleanup actions to be performed after resolution of a Promise.
	 */
	finally(callback: () => void | Thenable<any>): Promise<T> {
		// handler to be used for fulfillment and rejection; whether it was fulfilled or rejected is explicitly
		// indicated by the first argument
		let handler = (rejected: boolean, valueOrError: any) => {
			let result: any;
			try {
				result = callback();
				if (result && typeof result.then === 'function') {
					return result.then(
						() => {
							if (rejected) {
								throw valueOrError;
							}
							return valueOrError;
						}
					);
				}
				else {
					if (rejected) {
						throw valueOrError;
					}
					return valueOrError;
				}
			}
			catch (error) {
				return Promise.reject(error);
			}
		};

		return this.then<T>(handler.bind(null, false), handler.bind(null, true));
	}

	get state(): State {
		return this._state;
	}

	then<U>(onFulfilled?: (value: T) => U | Thenable<U>,  onRejected?: (error: any) => U | Thenable<U>): Promise<U> {
		return Promise.copy(super.then<U>(onFulfilled, onRejected));
	}
}

export enum State {
	Fulfilled = 1,
	Pending = 2,
	Rejected = 3
}
