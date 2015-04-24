/// <reference path="../../../dojo-platform/dist/typings/dojo-platform/dojo-platform-2.0.d.ts" />

import PlatformPromise, { isThenable, Thenable, Executor } from 'dojo-platform/Promise';

export class Promise<T> extends PlatformPromise<T> {
	static all<T>(items: (T | Thenable<T>)[]): Promise<T[]> {
		return new Promise<T[]>(PlatformPromise.all<T>(items));
	}

	static race<T>(items: (T | Thenable<T>)[]): Promise<T> {
		return new Promise<T>(PlatformPromise.race<T>(items));
	}

	static reject<T>(reason: any): Promise<T> {
		return new Promise<T>(PlatformPromise.reject<T>(reason));
	}

	static resolve<T>(value: (T | Thenable<T>)): Promise<T> {
		return new Promise<T>(PlatformPromise.resolve<T>(value));
	}

	constructor(executor: PlatformPromise<T> | Executor<T>) {
		super(executor);

		if (executor instanceof Promise && (<Promise<T>> executor).state !== State.Pending) {
			this.state = (<Promise<T>> executor).state;
		}
		else {
			super.then(
				() => this.state = State.Fulfilled,
				() => this.state = State.Rejected
			);
		}
	}

	state = State.Pending;

	catch<U>(onRejected: (reason?: any) => U | Thenable<U>): Promise<U> {
		return new Promise<U>(super.catch<U>(onRejected));
	}

	finally<U>(callback: () => U | Thenable<U>): Promise<U> {
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

		return this.then<U>(handler.bind(null, false), handler.bind(null, true));
	}

	then<U>(onFulfilled?: (value: T) => U | Thenable<U>,  onRejected?: (error: any) => U | Thenable<U>): Promise<U> {
		return new Promise<U>(super.then<U>(onFulfilled, onRejected));
	}
}

export enum State {
	Canceled,
	Fulfilled,
	Pending,
	Rejected
}
