import { isThenable } from '../shim/Promise';
import { PatchOperation } from './state/Patch';
import { replace, remove } from './state/operations';
import { Path, State, Store } from './Store';
import Map from '../shim/Map';
import has from '../core/has';

/**
 * Default Payload interface
 */
export interface DefaultPayload {
	[index: string]: any;
}

/**
 * The arguments passed to a `Command`
 */
export interface CommandRequest<T = any, P extends object = DefaultPayload> extends State<T> {
	payload: P;
	state: T;
}

/**
 * A command factory interface. Returns the passed command. This provides a way to automatically infer and/or
 * verify the type of multiple commands without explicitly specifying the generic for each command
 */
export interface CommandFactory<T = any, P extends object = DefaultPayload> {
	<R extends object = P>(command: AsyncCommandWithOps<T, R>): AsyncCommandWithOps<T, R>;
	<R extends object = P>(command: SyncCommandWithOps<T, R>): SyncCommandWithOps<T, R>;
	<R extends object = P>(command: AsyncCommand<T, R>): AsyncCommand<T, R>;
	<R extends object = P>(command: SyncCommand<T, R>): SyncCommand<T, R>;
}

export interface AsyncCommandWithOps<T = any, P extends object = DefaultPayload> {
	(request: CommandRequest<T, P>): Promise<PatchOperation<T>[]>;
}

export interface SyncCommandWithOps<T = any, P extends object = DefaultPayload> {
	(request: CommandRequest<T, P>): PatchOperation<T>[];
}

export interface AsyncCommand<T = any, P extends object = DefaultPayload> {
	(request: CommandRequest<T, P>): Promise<void>;
}

export interface SyncCommand<T = any, P extends object = DefaultPayload> {
	(request: CommandRequest<T, P>): void;
}

/**
 * Command that returns patch operations based on the command request
 */
export type Command<T = any, P extends object = DefaultPayload> =
	| SyncCommand<T, P>
	| ((request: CommandRequest<T, P>) => Promise<void | PatchOperation<T>[]>)
	| SyncCommandWithOps<T, P>;

/**
 * Transformer function
 */
export interface Transformer<P extends object = DefaultPayload, R extends object = DefaultPayload> {
	(payload: R): P;
}

/**
 * A process that returns an executor using a Store and Transformer
 */
export interface Process<T = any, P extends object = DefaultPayload> {
	<R extends object = DefaultPayload>(store: Store<T>, transformer: Transformer<P, R>): ProcessExecutor<T, P, R>;
	(store: Store<T>): ProcessExecutor<T, P, P>;
}

/**
 * Represents an error from a ProcessExecutor
 */
export interface ProcessError<T = any> {
	error: Error | null;
	command?: Command<T, any>[] | Command<T, any>;
}

export interface ProcessResultExecutor<T = any> {
	<P extends object = DefaultPayload, R extends object = DefaultPayload>(
		process: Process<T, P>,
		payload: R,
		transformer: Transformer<P, R>
	): Promise<ProcessResult<T, P> | ProcessError<T>>;
	<P extends object = object>(process: Process<T, P>, payload: P): Promise<ProcessResult<T, P> | ProcessError<T>>;
}

/**
 * Represents a successful result from a ProcessExecutor
 */
export interface ProcessResult<T = any, P extends object = DefaultPayload> extends State<T> {
	executor: ProcessResultExecutor<T>;
	store: Store<T>;
	operations: PatchOperation<T>[];
	undoOperations: PatchOperation<T>[];
	apply: (operations: PatchOperation<T>[], invalidate?: boolean) => PatchOperation<T>[];
	payload: P;
	id: string;
	error?: ProcessError<T> | null;
}

/**
 * Runs a process for the given arguments.
 */
export interface ProcessExecutor<T = any, P extends object = DefaultPayload, R extends object = DefaultPayload> {
	(payload: R): Promise<ProcessResult<T, P>>;
}

export interface ProcessCallback<T = any, P extends object = DefaultPayload> {
	(): {
		before?: ProcessCallbackBefore<T, P>;
		after?: ProcessCallbackAfter<T>;
	};
}

/**
 * Callback for a process, returns an error as the first argument
 */
export interface ProcessCallbackAfter<T = any> {
	(error: ProcessError<T> | null, result: ProcessResult<T>): void;
}

export interface ProcessCallbackBefore<T = any, P extends object = DefaultPayload> {
	(payload: P, store: Store<T>, id: string): void | Promise<void>;
}

/**
 * Function for undoing operations
 */
export interface Undo {
	(): void;
}

/**
 * ProcessCallbackDecorator callback
 */
interface ProcessCallbackDecorator {
	(callback?: ProcessCallback): ProcessCallback;
}

/**
 * CreateProcess factory interface
 */
export interface CreateProcess<T = any, P extends object = DefaultPayload> {
	(id: string, commands: (Command<T, P>[] | Command<T, P>)[], callback?: ProcessCallback<T>): Process<T, P>;
}

/**
 * Creates a command factory with the specified type
 */
export function createCommandFactory<T, P extends object = DefaultPayload>(): CommandFactory<T, P> {
	function commandFactory<R extends object = P>(command: AsyncCommand<T, R>): AsyncCommand<T, R>;
	function commandFactory<R extends object = P>(command: SyncCommand<T, R>): SyncCommand<T, R>;
	function commandFactory<R extends object = P>(command: AsyncCommandWithOps<T, R>): AsyncCommandWithOps<T, R>;
	function commandFactory<R extends object = P>(command: SyncCommandWithOps<T, R>): SyncCommandWithOps<T, R>;
	function commandFactory<R extends object = P>(command: Command<T, R>): Command<T, R> {
		return command;
	}
	return commandFactory;
}

/**
 * Commands that can be passed to a process
 */
export type Commands<T = any, P extends object = DefaultPayload> = (Command<T, P>[] | Command<T, P>)[];

const processMap = new Map();
const valueSymbol = Symbol('value');

export function isStateProxy(value: any) {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	return Boolean(value[valueSymbol]);
}

export function getProcess(id: string) {
	return processMap.get(id);
}

const proxyError = 'State updates are not available on legacy browsers';

function removeProxies(value: any) {
	if (typeof value === 'object' && value !== null) {
		if (value[valueSymbol]) {
			value = value[valueSymbol];
		}

		const newValue: typeof value = Array.isArray(value) ? [] : {};
		const keys = Object.keys(value);
		for (let i = 0; i < keys.length; i++) {
			newValue[keys[i]] = removeProxies(value[keys[i]]);
		}

		value = newValue;
	}

	return value;
}

export function processExecutor<T = any, P extends object = DefaultPayload>(
	id: string,
	commands: Commands<T, P>,
	store: Store<T>,
	before: ProcessCallbackBefore | undefined,
	after: ProcessCallbackAfter | undefined,
	transformer: Transformer<P> | undefined
): ProcessExecutor<T, any, any> {
	const { apply, get, path, at } = store;
	function executor(
		process: Process,
		payload: any,
		transformer?: Transformer
	): Promise<ProcessResult | ProcessError> {
		return process(store)(payload);
	}

	return async (executorPayload: P): Promise<ProcessResult<T, P>> => {
		const operations: PatchOperation[] = [];
		const commandsCopy = [...commands];
		let undoOperations: PatchOperation[] = [];
		let command = commandsCopy.shift();
		let error: ProcessError | null = null;
		const payload = transformer ? transformer(executorPayload) : executorPayload;

		if (before) {
			let result = before(payload, store, id);
			if (result) {
				await result;
			}
		}

		function createProxy() {
			const proxies = new Map<string, any>();
			const proxied = new Map<string, any>();

			const proxyOperations: PatchOperation[] = [];
			const createHandler = (partialPath?: Path<T, any>) => ({
				get(obj: any, prop: string): any {
					const fullPath = partialPath ? path(partialPath, prop) : path(prop as keyof T);
					const stringPath = fullPath.path;

					if (typeof prop === 'symbol' && prop === valueSymbol) {
						return proxied.get(stringPath);
					}

					let value = partialPath || obj.hasOwnProperty(prop) ? obj[prop] : get(fullPath);

					if (typeof value === 'object' && value !== null) {
						let proxiedValue;
						if (!proxies.has(stringPath)) {
							if (Array.isArray(value)) {
								value = value.slice();
							} else {
								value = { ...value };
							}
							proxiedValue = new Proxy(value, createHandler(fullPath));
							proxies.set(stringPath, proxiedValue);
							proxied.set(stringPath, value);
						} else {
							proxiedValue = proxies.get(stringPath);
						}

						obj[prop] = value;
						return proxiedValue;
					}

					obj[prop] = value;
					return value;
				},

				set(obj: any, prop: string, value: any) {
					value = removeProxies(value);

					proxyOperations.push(replace(partialPath ? path(partialPath, prop) : path(prop as keyof T), value));
					obj[prop] = value;

					return true;
				},

				deleteProperty(obj: any, prop: string) {
					proxyOperations.push(remove(partialPath ? path(partialPath, prop) : path(prop as keyof T)));
					delete obj[prop];

					return true;
				}
			});

			return { proxy: new Proxy({}, createHandler()) as T, operations: proxyOperations };
		}

		try {
			while (command) {
				let results = [];
				const commandArray = Array.isArray(command) ? command : [command];

				results = commandArray.map((commandFunction: Command<T, P>) => {
					let state: T;
					let proxyOperations: PatchOperation[] = [];
					if (typeof Proxy !== 'undefined') {
						const { operations, proxy } = createProxy();
						state = proxy;
						proxyOperations = operations;
					}
					let result = commandFunction({
						at,
						get,
						path,
						payload,
						get state() {
							if (typeof Proxy === 'undefined') {
								throw new Error(proxyError);
							}

							return state;
						}
					});

					if (isThenable(result)) {
						return result.then((result: any) => {
							result = result ? [...proxyOperations, ...result] : [...proxyOperations];

							return result;
						});
					} else {
						result =
							result && Array.isArray(result) ? [...proxyOperations, ...result] : [...proxyOperations];

						return result;
					}
				});
				let resolvedResults: PatchOperation[][];
				if (results.some(isThenable)) {
					resolvedResults = await Promise.all(results);
				} else {
					resolvedResults = results as PatchOperation[][];
				}

				for (let i = 0; i < results.length; i++) {
					operations.push(...resolvedResults[i]);
					undoOperations = [...apply(resolvedResults[i]), ...undoOperations];
				}

				store.invalidate();
				command = commandsCopy.shift();
			}
		} catch (e) {
			if (e.message === proxyError) {
				throw e;
			}
			error = { error: e, command };
		}

		after &&
			after(error, {
				undoOperations,
				store,
				id,
				operations,
				apply,
				at,
				get,
				path,
				executor,
				payload
			});
		return Promise.resolve({
			store,
			undoOperations,
			id,
			error,
			operations,
			apply,
			at,
			get,
			path,
			executor,
			payload
		});
	};
}
/**
 * Factories a process using the provided commands and an optional callback. Returns an executor used to run the process.
 *
 * @param commands The commands for the process
 * @param callback Callback called after the process is completed
 */
export function createProcess<T = any, P extends object = DefaultPayload>(
	id: string,
	commands: Commands<T, P>,
	callbacks?: ProcessCallback | ProcessCallback[]
): Process<T, P> {
	callbacks = Array.isArray(callbacks) ? callbacks : callbacks ? [callbacks] : [];

	const callback = callbacks.length
		? callbacks.reduce((callback, nextCallback) => {
				return combineCallbacks(nextCallback, id)(callback);
		  })
		: undefined;

	const { before = undefined, after = undefined } = callback ? callback() : {};

	processMap.set(id, [id, commands, before, after]);
	return (store: Store<T>, transformer?: Transformer<P>) =>
		processExecutor(id, commands, store, before, after, transformer);
}

/**
 * Creates a process factory that will create processes with the specified callback decorators applied.
 * @param callbacks array of process callback to be used by the returned factory.
 * @param initializers array of process initializers to be used by the returned factory.
 */
export function createProcessFactoryWith(callbacks: ProcessCallback[]) {
	return <S, P extends object>(
		id: string,
		commands: (Command<S, P>[] | Command<S, P>)[],
		callback?: ProcessCallback<S>
	): Process<S, P> => {
		return createProcess(id, commands, callback ? [...callbacks, callback] : callbacks);
	};
}

/**
 * Creates a `ProcessCallbackDecorator` from a `ProcessCallback`.
 * @param processCallback the process callback to convert to a decorator.
 * @param id process id to be passed to the before callback
 */
function combineCallbacks(processCallback: ProcessCallback, id: string): ProcessCallbackDecorator {
	const { before, after } = processCallback();
	return (previousCallback?: ProcessCallback) => {
		const { before: previousBefore = undefined, after: previousAfter = undefined } = previousCallback
			? previousCallback()
			: {};
		return () => ({
			after(error: ProcessError | null, result: ProcessResult) {
				if (previousAfter) {
					previousAfter(error, result);
				}

				if (after) {
					after(error, result);
				}
			},
			before(payload: DefaultPayload, store: Store<any>) {
				if (previousBefore) {
					previousBefore(payload, store, id);
				}

				if (before) {
					before(payload, store, id);
				}
			}
		});
	};
}

export function createCallbackDecorator(
	callback: ProcessCallbackAfter
): (callbacks?: ProcessCallback[]) => ProcessCallback[] {
	if (has('dojo-debug')) {
		console.warn(
			'Process using the the legacy middleware API. Please update to use the latest API, see https://github.com/dojo/framework/blob/master/docs/V5-Migration-Guide.md for details.'
		);
	}
	const convertedCallback = () => ({
		after: callback
	});
	return (callbacks: ProcessCallback[] = []) => {
		return [convertedCallback, ...callbacks];
	};
}
