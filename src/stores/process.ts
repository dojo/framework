import { isThenable } from '@dojo/shim/Promise';
import { PatchOperation } from './state/Patch';
import { Store } from './Store';

/**
 * The arguments passed to a `Command`
 */
export interface CommandRequest {
	get<T = any>(pointer: string): T;
	payload: any[];
}

/**
 * Command that returns patch operations based on the command request
 */
export interface Command {
	(request?: CommandRequest): Promise<PatchOperation[]> | PatchOperation[];
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
	(store: Store, transformer?: Transformer): ProcessExecutor<T>;
}

/**
 * Represents an error from a ProcessExecutor
 */
export interface ProcessError {
	error: Error;
	command?: Command[] | Command;
}

/**
 * Represents a successful result from a ProcessExecutor
 */
export interface ProcessResult {
	executor: (process: Process, payload?: any, payloadTransformer?: Transformer) => Promise<ProcessResult | ProcessError>;
	undo: Undo;
	operations: PatchOperation[];
	apply: (operations: PatchOperation[], invalidate?: boolean) => PatchOperation[];
	get: <T>(pointer: string) => T;
	payload: any;
}

/**
 * Runs a process for the given arguments.
 */
export interface ProcessExecutor<T = any> {
	(payload?: T): Promise<ProcessResult | ProcessError>;
}

/**
 * Callback for a process, returns an error as the first argument
 */
export interface ProcessCallback {
	(error: ProcessError | null, result: ProcessResult): void;
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
	(commands: (Command[] | Command)[], callback?: ProcessCallback): Process;
}

/**
 * Factories a process using the provided commands and an optional callback. Returns an executor used to run the process.
 *
 * @param commands The commands for the process
 * @param callback Callback called after the process is completed
 */
export function createProcess<T>(commands: (Command[] | Command)[], callback?: ProcessCallback): Process {
	return (store: Store, transformer?: Transformer): ProcessExecutor<T> => {
		const { apply, get } = store;
		function executor(process: Process, payload?: any, payloadTransformer?: Transformer): Promise<ProcessResult | ProcessError> {
			return process(store, payloadTransformer)(payload);
		}

		return async (...payload: any[]): Promise<ProcessResult | ProcessError>  => {
			const undoOperations: PatchOperation[] = [];
			const operations: PatchOperation[] = [];
			const commandsCopy = [ ...commands ];
			const undo = () => {
				store.apply(undoOperations, true);
			};

			let command = commandsCopy.shift();
			let error: ProcessError | null = null;
			payload = transformer ? [ transformer(payload) ] : payload;
			try {
				while (command) {
					let results = [];
					if (Array.isArray(command)) {
						results = command.map((commandFunction) => commandFunction({ get: store.get, payload }));
						results = await Promise.all(results);
					}
					else {
						let result = command({ get: store.get, payload });
						if (isThenable(result)) {
							result = await result;
						}
						results = [ result ];
					}

					for (let i = 0; i < results.length; i++) {
						operations.push(...results[i]);
						undoOperations.push(...apply(results[i]));
					}

					store.invalidate();
					command = commandsCopy.shift();
				}
			}
			catch (e) {
				error = { error: e, command };
			}

			callback && callback(error, { operations, undo, apply, get, executor, payload });
			return Promise.resolve({ error, operations, undo, apply, get, executor, payload });
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
		return (error: ProcessError, result: ProcessResult): void => {
			processCallback(error, result);
			previousCallback && previousCallback(error, result);
		};
	};
}
