import { isThenable } from '@dojo/shim/Promise';
import { PatchOperation } from './state/Patch';
import { State, Store } from './Store';

/**
 * The arguments passed to a `Command`
 */
export interface CommandRequest<T = any> extends State<T> {
	payload: any[];
}

/**
 * A command factory interface. Returns the passed command. This provides a way to automatically infer and/or
 * verify the type of multiple commands without explicitly specifying the generic for each command
 */
export interface CommandFactory<T = any> {
	(command: Command<T>): Command<T>;
}

/**
 * Command that returns patch operations based on the command request
 */
export interface Command<T = any> {
	(request: CommandRequest<T>): Promise<PatchOperation<T>[]> | PatchOperation<T>[];
}

/**
 * Transformer function
 */
export interface Transformer {
	(payload: any): any;
}

/**
 * A process that returns an executor using a Store and Transformer
 */
export interface Process<T = any> {
	(store: Store<T>, transformer?: Transformer): ProcessExecutor<T>;
}

/**
 * Represents an error from a ProcessExecutor
 */
export interface ProcessError<T = any> {
	error: Error;
	command?: Command<T>[] | Command<T>;
}

/**
 * Represents a successful result from a ProcessExecutor
 */
export interface ProcessResult<T = any> extends State<T> {
	executor: (
		process: Process<T>,
		payload?: any,
		payloadTransformer?: Transformer
	) => Promise<ProcessResult<T> | ProcessError<T>>;
	undo: Undo;
	operations: PatchOperation<T>[];
	apply: (operations: PatchOperation<T>[], invalidate?: boolean) => PatchOperation<T>[];
	payload: any;
}

/**
 * Runs a process for the given arguments.
 */
export interface ProcessExecutor<T = any> {
	(payload?: T): Promise<ProcessResult<T> | ProcessError<T>>;
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
export interface CreateProcess {
	<T>(commands: (Command<T>[] | Command<T>)[], callback?: ProcessCallback<T>): Process<T>;
}

/**
 * Creates a command factory with the specified type
 */
export function createCommandFactory<T>(): CommandFactory<T> {
	return (command) => command;
}

/**
 * Factories a process using the provided commands and an optional callback. Returns an executor used to run the process.
 *
 * @param commands The commands for the process
 * @param callback Callback called after the process is completed
 */
export function createProcess<T>(commands: (Command<T>[] | Command<T>)[], callback?: ProcessCallback): Process<T> {
	return (store: Store<T>, transformer?: Transformer): ProcessExecutor<T> => {
		const { apply, get, path, at } = store;
		function executor(
			process: Process,
			payload?: any,
			payloadTransformer?: Transformer
		): Promise<ProcessResult | ProcessError> {
			return process(store, payloadTransformer)(payload);
		}

		return async (...payload: any[]): Promise<ProcessResult | ProcessError> => {
			const undoOperations: PatchOperation[] = [];
			const operations: PatchOperation[] = [];
			const commandsCopy = [...commands];
			const undo = () => {
				store.apply(undoOperations, true);
			};

			let command = commandsCopy.shift();
			let error: ProcessError | null = null;
			payload = transformer ? [transformer(payload)] : payload;
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
						undoOperations.push(...apply(results[i]));
					}

					store.invalidate();
					command = commandsCopy.shift();
				}
			} catch (e) {
				error = { error: e, command };
			}

			callback && callback(error, { operations, undo, apply, at, get, path, executor, payload });
			return Promise.resolve({ error, operations, undo, apply, at, get, path, executor, payload });
		};
	};
}

/**
 * Creates a process factory that will create processes with the specified callback decorators applied.
 * @param callbackDecorators array of process callback decorators to be used by the return factory.
 */
export function createProcessFactoryWith(callbackDecorators: ProcessCallbackDecorator[]): CreateProcess {
	return (commands: (Command[] | Command)[], callback?: ProcessCallback): Process => {
		const decoratedCallback = callbackDecorators.reduce((callback, callbackDecorator) => {
			return callbackDecorator(callback);
		}, callback);
		return createProcess(commands, decoratedCallback);
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
