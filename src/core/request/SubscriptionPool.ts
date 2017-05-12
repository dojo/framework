import { SubscriptionObserver } from '@dojo/shim/Observable';

export default class SubscriptionPool<T> {
	private _observers: SubscriptionObserver<T>[] = [];
	private _queue: T[] = [];
	private _queueMaxLength: number;

	constructor(maxLength = 10) {
		this._queueMaxLength = maxLength;
	}

	add(subscription: SubscriptionObserver<T>) {
		this._observers.push(subscription);

		while (this._queue.length > 0) {
			this.next(this._queue.shift()!);
		}

		return () => {
			this._observers.splice(this._observers.indexOf(subscription), 1);
		};
	}

	next(value: T) {
		if (this._observers.length === 0) {
			this._queue.push(value);

			// when the queue is full, get rid of the first ones
			while (this._queue.length > this._queueMaxLength) {
				this._queue.shift();
			}
		}

		this._observers.forEach(observer => {
			observer.next(value);
		});
	}

	complete() {
		this._observers.forEach(observer => {
			observer.complete();
		});
	}
}
