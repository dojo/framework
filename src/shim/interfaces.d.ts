/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
	then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => void): Thenable<U>;
}

export interface ArrayLike<T> {
	length: number;
	[n: number]: T;
}

export interface Handle {
	/**
	 * Perform the destruction/cleanup logic associated with this handle
	 */
	destroy(): void;
}
