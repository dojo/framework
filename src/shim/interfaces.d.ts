export interface Handle {
	/**
	 * Perform the destruction/cleanup logic associated with this handle
	 */
	destroy(): void;
}

/**
 * Something that is _thenable_
 * @deprecated Use `PromiseLike` from TypeScript lib instead
 */
export type Thenable<T> = PromiseLike<T>;
