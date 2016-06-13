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
export interface Request<PP extends Parameters> {
	/**
	 * The dispatch context.
	 */
	context: Context;

	/**
	 * The extracted parameters.
	 */
	params: PP;
}
