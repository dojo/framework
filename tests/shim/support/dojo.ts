declare module 'intern/dojo/Deferred' {
	import Promise = require('dojo/Promise');

	class Deferred<T> {
		/**
		 * The underlying promise for the Deferred.
		 */
		promise: Promise<T>;
		constructor(canceler?: Promise.Canceler);
		/**
		 * Sends progress information for the underlying promise.
		 *
		 * @method
		 * @param data Additional information about the asynchronous operation’s progress.
		 */
		progress: (data?: any) => void;
		/**
		 * Rejects the underlying promise with an error.
		 *
		 * @method
		 * @param error The error that should be used as the fulfilled value for the promise.
		 */
		reject: (error?: Error) => void;
		/**
		 * Resolves the underlying promise with a value.
		 *
		 * @method
		 * @param value The value that should be used as the fulfilled value for the promise.
		 */
		resolve: (value?: Promise.Thenable<T> | T) => void;
	}
	export = Deferred;
}
