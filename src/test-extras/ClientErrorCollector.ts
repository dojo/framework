import * as Command from 'leadfoot/Command';

export interface ClientError {
	message: string;
	source?: string;
	lineno?: number;
	colno?: number;
	error?: {
		message: string;
		name: string;
		stack?: string;
	};
}

export default class ClientErrorCollector {
	private _remote: Command<void>;
	private _inited: boolean = false;

	/**
	 * Create a new instance of a client error collector
	 * @param remote Pass a reference to the remote command of the test Suite
	 */
	constructor (remote: Command<void>) {
		this._remote = remote;
	}

	/**
	 * `finish()` the collector and if there are any client errors, throw on the first client error
	 *
	 * @param message The message to explain if the assertion fails
	 */
	assertNoErrors(message?: string): Command<undefined> {
		return this.finish()
			.then((results) => {
				if (results && results.length) {
					const result = results[0];
					let e: Error;
					if (result.error) {
						switch (result.error.name) {
						case 'EvalError':
							e = new EvalError(result.error.message);
							break;
						case 'RangeError':
							e = new RangeError(result.error.message);
							break;
						case 'ReferenceError':
							e = new ReferenceError(result.error.message);
							break;
						case 'SyntaxError':
							e = new SyntaxError(result.error.message);
							break;
						case 'TypeError':
							e = new TypeError(result.error.message);
							break;
						default:
							e = new Error(result.error.message);
						}
						e.stack = result.error.stack;
					}
					else {
						e = new Error(result.message);
					}
					(<any> e).fileName = result.source;
					(<any> e).lineNumber = result.lineno;
					(<any> e).columnNumber = result.colno;
					throw e;
				}
			});
	}

	/**
	 * Remove the client side error collector and resolve with any errors
	 */
	finish(): Command<ClientError[] | undefined> {
		if (!this._inited) {
			throw new Error('ClientErrorCollector not initialised.');
		}

		return this._remote
			.execute( /* istanbul ignore next */ () => (<any> window)['__intern_error_helper_finish'](), [])
			.then((results: any) => {
				return JSON.parse(results);
			});
	}

	/**
	 * Initialise the client error collector by installing the collector on the remote client.  Execute `finish()`
	 * or `assertNoErrors()` in order to remove the client error collector and uninstall the collector.
	 */
	init(): Command<undefined> {
		if (this._inited) {
			throw new Error('ClientErrorCollector already initialised.');
		}

		return this._remote
			.execute( /* istanbul ignore next */ () => {
				const CLIENT_ERROR_STACK_KEY = '__intern_error_stack';
				const CLIENT_OLD_ONERROR_KEY = '__intern_old_onerror';

				const errorStack: ClientError[] = (<any> window)[CLIENT_ERROR_STACK_KEY] = [];
				let oldonerror: any;
				if (window.onerror) {
					oldonerror = (<any> window)[CLIENT_OLD_ONERROR_KEY] = window.onerror;
				}

				function errorListener(evt: ErrorEvent) {
					const { message, filename, lineno, colno, error = {} } = evt;
					const { stack = '', name = 'Error' } = error;
					errorStack.push({
						message,
						source: filename,
						lineno,
						colno,
						error: {
							message: error.message || message,
							name,
							stack
						}
					});
				}

				window.addEventListener('error', errorListener);

				(<any> window)['__intern_error_helper_finish'] = function () {
					window.removeEventListener('error', errorListener);
					const errorStack = (<any> window)[CLIENT_ERROR_STACK_KEY];
					delete (<any> window)[CLIENT_ERROR_STACK_KEY];
					return JSON.stringify(errorStack);
				};
			}, [])
			.then(() => {
				this._inited = true;
			});
	}
}
