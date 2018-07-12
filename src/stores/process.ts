import { isThenable } from '@dojo/shim/Promise';
import { PatchOperation } from './state/Patch';
import { State, Store } from './Store';
import Map from '@dojo/shim/Map';

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
}

/**
 * A command factory interface. Returns the passed command. This provides a way to automatically infer and/or
 * verify the type of multiple commands without explicitly specifying the generic for each command
 */
export interface CommandFactory<T = any, P extends object = DefaultPayload> {
	<R extends object = P>(command: Command<T, R>): Command<T, R>;
}

/**
 * Command that returns patch operations based on the command request
 */
export interface Command<T = any, P extends object = DefaultPayload> {
	(request: CommandRequest<T, P>): Promise<PatchOperation<T>[]> | PatchOperation<T>[];
}

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

/**
 * Callback for a process, returns an error as the first argument
 */
export interface ProcessCallback<T = any> {
	(error: ProcessError<T> | null, result: ProcessResult<T>): void;
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
export interface ProcessCallbackDecorator {
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
	return <R extends object = P>(command: Command<T, R>) => command;
}

/**
 * Commands that can be passed to a process
 */
export type Commands<T = any, P extends object = DefaultPayload> = (Command<T, P>[] | Command<T, P>)[];

const processMap = new Map();

export function getProcess(id: string) {
	return processMap.get(id);
}

export function processExecutor<T = any, P extends object = DefaultPayload>(
	id: string,
	commands: Commands<T, P>,
	store: Store<T>,
	callback: ProcessCallback | undefined,
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
		try {
			while (command) {
				let results = [];
				if (Array.isArray(command)) {
					results = command.map((commandFunction) => commandFunction({ at, get, path, payload }));
					results = await Promise.all(results);
				} else {
					let result = command({ at, get, path, payload });
					if (isThenable(result)) {
						result = await result;
					}
					results = [result];
				}

				for (let i = 0; i < results.length; i++) {
					operations.push(...results[i]);
					undoOperations = [...apply(results[i]), ...undoOperations];
				}

				store.invalidate();
				command = commandsCopy.shift();
			}
		} catch (e) {
			error = { error: e, command };
		}

		callback &&
			callback(error, {
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
	callback?: ProcessCallback
): Process<T, P> {
	processMap.set(id, [id, commands, callback]);
	return (store: Store<T>, transformer?: Transformer<P>) =>
		processExecutor(id, commands, store, callback, transformer);
}

/**
 * Creates a process factory that will create processes with the specified callback decorators applied.
 * @param callbackDecorators array of process callback decorators to be used by the return factory.
 */
export function createProcessFactoryWith(callbackDecorators: ProcessCallbackDecorator[]): CreateProcess {
	return (id: string, commands: (Command[] | Command)[], callback?: ProcessCallback): Process => {
		const decoratedCallback = callbackDecorators.reduce((callback, callbackDecorator) => {
			return callbackDecorator(callback);
		}, callback);
		return createProcess(id, commands, decoratedCallback);
	};
}

/**
 * Creates a `ProcessCallbackDecorator` from a `ProcessCallback`.
 * @param processCallback the process callback to convert to a decorator.
 */
export function createCallbackDecorator(processCallback: ProcessCallback): ProcessCallbackDecorator {
	return (previousCallback?: ProcessCallback): ProcessCallback => {
		return (error: ProcessError | null, result: ProcessResult): void => {
			processCallback(error, result);
			previousCallback && previousCallback(error, result);
		};
	};
}
