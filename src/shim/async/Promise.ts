import PlatformPromise, { isThenable, Thenable, Executor } from '../Promise';
export { Thenable } from '../Promise';

export default class Promise<T> extends PlatformPromise<T> {
	static all<T>(items: (T | Thenable<T>)[]): Promise<T[]> {
		return new Promise<T[]>(PlatformPromise.all<T>(items));
	}

	static race<T>(items: (T | Thenable<T>)[]): Promise<T> {
		return new Promise<T>(PlatformPromise.race<T>(items));
	}

	static reject<T>(reason: any): Promise<any> {
		return new Promise<T>(PlatformPromise.reject<T>(reason));
	}

	static resolve(): Promise<void>;
	static resolve<T>(value: (T | Thenable<T>)): Promise<T>;
	static resolve<T>(value?: any): Promise<T> {
		return new Promise<T>(PlatformPromise.resolve<T>(value));
	}

	constructor(executor: PlatformPromise<T> | Executor<T>) {
		super(executor);

		if (executor instanceof Promise && (<Promise<T>> executor)._state !== State.Pending) {
			this._state = (<Promise<T>> executor)._state;
		}
		else {
			super.then(
				() => this._state = State.Fulfilled,
				() => this._state = State.Rejected
			);
		}
	}

	protected _state = State.Pending;

	catch<U>(onRejected: (reason?: any) => U | Thenable<U>): Promise<U> {
		return new Promise<U>(super.catch<U>(onRejected));
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
		return new Promise<U>(super.then<U>(onFulfilled, onRejected));
	}
}

export enum State {
	Fulfilled = 1,
	Pending = 2,
	Rejected = 3
}

export {
	Thenable
}
