/**
 * Routes created without a `params()` function will receive a `params` object of this type.
 */
export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

/**
 * Describes the context object used when dispatching. Extend this interface for custom contexts.
 */
export interface Context {
	// TODO: Does specifiying an indexer make sense here?
}

/**
 * Describes extracted parameters.
 */
export interface Parameters {
	// TODO: Does specifying an indexer make sense here?
}

/**
 * Describes the object passed to various route handlers.
 */
export interface Request<C extends Context, P extends Parameters> {
	/**
	 * The dispatch context.
	 */
	context: C;

	/**
	 * The extracted parameters.
	 */
	params: P;
}
