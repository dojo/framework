const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import Test from 'intern/lib/Test';

import { uuid } from '../../../src/core/util';
import { Pointer } from './../../../src/stores/state/Pointer';
import { OperationType, PatchOperation } from './../../../src/stores/state/Patch';
import {
	CommandRequest,
	createCommandFactory,
	createProcess,
	createProcessFactoryWith,
	ProcessCallback,
	ProcessError,
	ProcessResult,
	ProcessCallbackAfter,
	createCallbackDecorator
} from '../../../src/stores/process';
import { Store } from '../../../src/stores/Store';
import { replace } from '../../../src/stores/state/operations';

let store: Store;
let promises: Promise<any>[] = [];
let promiseResolvers: Function[] = [];

function promiseResolver() {
	for (let i = 0; i < promiseResolvers.length; i++) {
		promiseResolvers[i]();
	}
}

const testCommandFactory = (path: string) => {
	return ({ payload }: CommandRequest): PatchOperation[] => {
		const value = Object.keys(payload).length === 0 ? path : payload;
		return [{ op: OperationType.ADD, path: new Pointer(`/${path}`), value }];
	};
};

const testProxyCommandFactory = (...paths: string[]) => {
	return ({ payload, state }: CommandRequest) => {
		const value = Object.keys(payload).length === 0 ? paths.join('/') : payload;
		let intermediate = state;
		paths.forEach((path, index) => {
			if (index === paths.length - 1) {
				intermediate[path] = value;
			} else {
				if (typeof intermediate[path] !== 'object') {
					intermediate[path] = {};
				}
				intermediate = intermediate[path];
			}
		});
	};
};

const testAsyncCommandFactory = (path: string) => {
	return ({ payload }: CommandRequest): Promise<PatchOperation[]> => {
		const promise = new Promise<any>((resolve) => {
			promiseResolvers.push(() => {
				const value = Object.keys(payload).length === 0 ? path : payload;
				resolve([{ op: OperationType.ADD, path: new Pointer(`/${path}`), value }]);
			});
		});
		promises.push(promise);
		return promise;
	};
};

const testAsyncProxyCommandFactory = (...paths: string[]) => {
	return ({ payload, state }: CommandRequest) => {
		const promise = new Promise<any>((resolve) => {
			const value = Object.keys(payload).length === 0 ? paths.join('/') : payload;
			let intermediate = state;
			paths.forEach((path, index) => {
				if (index === paths.length - 1) {
					intermediate[path] = value;
				} else {
					intermediate = intermediate[path];
				}
			});
			promiseResolvers.push(() => {
				resolve();
			});
		});
		promises.push(promise);
		return promise;
	};
};

const testIterativeProxyCommand = ({ payload, state }: CommandRequest) => {
	state.itemCount = 0;
	state.items = [];
	for (let i = 0; i < 10; i++) {
		state.itemCount++;
		state.items.push(i);
	}
	state.items.splice(5, 3, { foo: 'bar' }, { bar: 'baz' });
	state.items[5].foo = { bar: 'baz' };
	state.temp = 'temp';
	delete state.temp;
	state.finalCount = state.items.length;
};

const testNoop = ({ payload }: CommandRequest): any => {};

const testErrorCommand = ({ payload }: CommandRequest): any => {
	throw new Error('Command Failed');
};
const testSelfAssignment = ({ state }: CommandRequest) => {
	const id = uuid();
	if (state) {
		const label = state.currentTodo ? state.currentTodo.trim() : '';

		if (label) {
			state.todos = state.todos || {};
			state.todos[id] = { label, id };
		} else {
			state.currentTodo = '';
		}
	}
};

const testSetCurrentTodo = ({ payload, state }: CommandRequest) => {
	state.currentTodo = payload.label;
};

const testUpdateCompletedFlagCommand = ({ state }: CommandRequest) => {
	if (state) {
		state.completed = state.todoCount > 0 && state.todoCount === state.completedCount;
	}
};

const testUpdateTodoCountsCommand = ({ state }: CommandRequest) => {
	if (state) {
		const todos = state.todos;
		const todoArray = Object.keys(todos).map((key) => todos[key]);

		state.todoCount = todoArray.length;
		state.completedCount = todoArray.filter(({ completed }) => completed).length;
	}
};

describe('process', () => {
	beforeEach(() => {
		store = new Store();
		promises = [];
		promiseResolvers = [];
	});

	it('with synchronous commands running in order', () => {
		const process = createProcess('test', [[testCommandFactory('foo')], testCommandFactory('foo/bar')]);
		const processExecutor = process(store);
		processExecutor({});
		const foo = store.get(store.path('foo'));
		const foobar = store.get(store.path('foo', 'bar'));
		assert.deepEqual(foo, { bar: 'foo/bar' });
		assert.strictEqual(foobar, 'foo/bar');
	});

	it('handles commands modifying the state proxy directly', (test: Test) => {
		if (typeof Proxy === 'undefined') {
			test.skip('Proxy updates require Proxy');
		}
		const process = createProcess('test', [
			[testProxyCommandFactory('foo')],
			testProxyCommandFactory('foo', 'bar')
		]);
		const processExecutor = process(store);
		processExecutor({});
		const foo = store.get(store.path('foo'));
		const foobar = store.get(store.path('foo', 'bar'));
		assert.deepEqual(foo, { bar: 'foo/bar' });
		assert.strictEqual(foobar, 'foo/bar');
	});

	it('Can set a proxied property to itself', (test: Test) => {
		if (typeof Proxy === 'undefined') {
			test.skip('Proxy updates require Proxy');
		}
		const process = createProcess('test', [
			testSetCurrentTodo,
			testSelfAssignment,
			testUpdateTodoCountsCommand,
			testUpdateCompletedFlagCommand
		]);
		process(store)({ label: 'label-1' });
		process(store)({ label: 'label-2' });
		const todos = store.get(store.path('todos'));
		const todoCount = store.get(store.path('todoCount'));
		const completedCount = store.get(store.path('completedCount'));
		assert.strictEqual(Object.keys(todos).length, 2);
		assert.strictEqual(todoCount, 2);
		assert.strictEqual(completedCount, 0);
	});

	it('processes wait for asynchronous commands to complete before continuing', () => {
		const process = createProcess('test', [
			testCommandFactory('foo'),
			testAsyncCommandFactory('bar'),
			testCommandFactory('foo/bar')
		]);
		const processExecutor = process(store);
		const promise = processExecutor({});
		const foo = store.get(store.path('foo'));
		const bar = store.get(store.path('bar'));
		assert.strictEqual(foo, 'foo');
		assert.isUndefined(bar);
		promiseResolver();
		return promise.then(() => {
			const foo = store.get(store.path('foo'));
			const bar = store.get(store.path('bar'));
			const foobar = store.get(store.path('foo', 'bar'));
			assert.deepEqual(foo, { bar: 'foo/bar' });
			assert.strictEqual(bar, 'bar');
			assert.strictEqual(foobar, 'foo/bar');
		});
	});

	it('does not make updates till async processes that modify the proxy resolve', async (test: Test) => {
		if (typeof Proxy === 'undefined') {
			test.skip('Proxy updates require Proxy');
		}
		const process = createProcess('test', [testAsyncProxyCommandFactory('foo')]);
		const processExecutor = process(store);
		const promise = processExecutor({});

		let foo = store.get(store.path('foo'));
		assert.isUndefined(foo);

		promiseResolver();
		await promise;
		foo = store.get(store.path('foo'));
		assert.equal(foo, 'foo');
	});

	it('waits for asynchronous commands to complete before continuing with proxy updates', async (test: Test) => {
		if (typeof Proxy === 'undefined') {
			test.skip('Proxy updates require Proxy');
		}
		const process = createProcess('test', [
			testProxyCommandFactory('foo'),
			testAsyncProxyCommandFactory('bar'),
			testProxyCommandFactory('foo', 'bar')
		]);
		const processExecutor = process(store);
		const promise = processExecutor({});

		let foo = store.get(store.path('foo'));
		let bar = store.get(store.path('bar'));
		assert.strictEqual(foo, 'foo');
		assert.isUndefined(bar);

		promiseResolver();
		await promise;
		foo = store.get(store.path('foo'));
		bar = store.get(store.path('bar'));
		const foobar = store.get(store.path('foo', 'bar'));
		assert.deepEqual(foo, { bar: 'foo/bar' });
		assert.strictEqual(bar, 'bar');
		assert.strictEqual(foobar, 'foo/bar');
	});

	it('updates the proxy as it is being modified', (test: Test) => {
		if (typeof Proxy === 'undefined') {
			test.skip('Proxy updates require Proxy');
		}
		const process = createProcess('test', [testIterativeProxyCommand]);
		const processExecutor = process(store);
		processExecutor({});

		const itemCount = store.get(store.path('itemCount'));
		assert.equal(itemCount, 10);
		const finalCount = store.get(store.path('finalCount'));
		assert.equal(finalCount, 9);
		const items = store.get(store.path('items'));
		assert.deepEqual(items, [0, 1, 2, 3, 4, { foo: { bar: 'baz' } }, { bar: 'baz' }, 8, 9]);
		const temp = store.get(store.path('temp'));
		assert.isUndefined(temp);
	});

	it('support concurrent commands executed synchronously', () => {
		const process = createProcess('test', [
			testCommandFactory('foo'),
			[testAsyncCommandFactory('bar'), testAsyncCommandFactory('baz')],
			testCommandFactory('foo/bar')
		]);
		const processExecutor = process(store);
		const promise = processExecutor({});
		promiseResolvers[0]();
		return promises[0].then(() => {
			const bar = store.get(store.path('bar'));
			const baz = store.get(store.path('baz'));
			assert.isUndefined(bar);
			assert.isUndefined(baz);
			promiseResolver();
			return promise.then(() => {
				const bar = store.get(store.path('bar'));
				const baz = store.get(store.path('baz'));
				assert.strictEqual(bar, 'bar');
				assert.strictEqual(baz, 'baz');
			});
		});
	});

	it('passes the payload to each command', () => {
		const process = createProcess('test', [
			testCommandFactory('foo'),
			testCommandFactory('bar'),
			testCommandFactory('baz')
		]);
		const processExecutor = process(store);
		processExecutor({ payload: 'payload' });
		const foo = store.get(store.path('foo'));
		const bar = store.get(store.path('bar'));
		const baz = store.get(store.path('baz'));
		assert.deepEqual(foo, { payload: 'payload' });
		assert.deepEqual(bar, { payload: 'payload' });
		assert.deepEqual(baz, { payload: 'payload' });
	});

	it('can use a transformer for the arguments passed to the process executor', () => {
		const process = createProcess<any, { foo: string }>('test', [
			testCommandFactory('foo'),
			testCommandFactory('bar'),
			testCommandFactory('baz')
		]);
		const processExecutorOne = process(store, (payload: { foo: number }) => {
			return { foo: 'changed' };
		});

		const processExecutorTwo = process(store);

		processExecutorTwo({ foo: '' });
		processExecutorOne({ foo: 1 });
		// processExecutorOne({ foo: '' }); // doesn't compile

		const foo = store.get(store.path('foo'));
		const bar = store.get(store.path('bar'));
		const baz = store.get(store.path('baz'));
		assert.deepEqual(foo, { foo: 'changed' });
		assert.deepEqual(bar, { foo: 'changed' });
		assert.deepEqual(baz, { foo: 'changed' });
	});

	it('provides a command factory', () => {
		const createCommand = createCommandFactory<{ foo: string }, { foo: string }>();

		const command = createCommand(({ get, path, payload }) => {
			// get(path('bar')); // shouldn't compile
			payload.foo;
			// payload.bar; // shouldn't compile
			get(path('foo'));
			return [];
		});

		assert.equal(typeof command, 'function');
	});

	it('can type payload that extends an object', () => {
		const createCommandOne = createCommandFactory<any, { foo: string }>();
		const createCommandTwo = createCommandFactory<any, { bar: string }>();
		const createCommandThree = createCommandFactory();
		const commandOne = createCommandOne(({ get, path, payload }) => []);
		const commandTwo = createCommandTwo(({ get, path, payload }) => []);
		const commandThree = createCommandThree(({ get, path, payload }) => []);
		const processOne = createProcess<any, { foo: string; bar: string }>('test', [commandOne, commandTwo]);
		// createProcess('test', [commandOne, commandTwo]); // shouldn't compile
		// createProcess<any, { bar: string }>([commandOne]); // shouldn't compile
		const processTwo = createProcess('test', [commandTwo]);
		const processThree = createProcess('test', [commandThree]);
		const executorOne = processOne(store);
		const executorTwo = processTwo(store);
		const executorThree = processThree(store);

		// executorOne({}); // shouldn't compile
		// executorOne({ foo: 1 }); // shouldn't compile
		executorOne({ foo: 'bar', bar: 'string' });
		executorTwo({ bar: 'bar' });
		// executorTwo({}); // shouldn't compile;
		// executorTwo(1); // shouldn't compile
		// executorTwo(''); // shouldn't compile
		// executorThree(); // shouldn't compile
		executorThree({});
	});

	it('if a transformer is provided it determines the payload type', () => {
		const createCommandOne = createCommandFactory<any, { bar: number }>();
		const createCommandTwo = createCommandFactory<any, { foo: number }>();
		const commandOne = createCommandOne(({ get, path, payload }) => []);
		const commandTwo = createCommandTwo(({ get, path, payload }) => []);
		const transformerOne = (payload: { foo: string }): { bar: number } => {
			return {
				bar: 1
			};
		};
		const transformerTwo = (payload: { foo: number }): { bar: number; foo: number } => {
			return {
				bar: 1,
				foo: 2
			};
		};

		const processOne = createProcess('test', [commandOne]);
		const processTwo = createProcess<any, { bar: number; foo: number }>('test', [commandOne, commandTwo]);
		const processOneResult = processOne(store, transformerOne)({ foo: '' });
		// processTwo(store, transformerOne); // compile error
		const processTwoResult = processTwo(store, transformerTwo)({ foo: 3 });
		// processTwo(store)({ foo: 3 }); // compile error
		processOneResult.then((result) => {
			result.payload.bar.toPrecision();
			result.executor(processTwo, { foo: 3, bar: 1 });
			// result.executor(processTwo, { foo: 3, bar: '' }); // compile error
			result.executor(processTwo, { foo: 1 }, transformerTwo);
			// result.executor(processTwo, { foo: '' }, transformerTwo); // compile error
			// result.payload.bar.toUpperCase(); // compile error
			// result.payload.foo; // compile error
		});
		processTwoResult.then((result) => {
			result.payload.bar.toPrecision();
			result.payload.foo.toPrecision();
			// result.payload.bar.toUpperCase(); // compile error
			// result.payload.foo.toUpperCase(); // compile error
		});
	});

	it('can provide a callback that gets called on process completion', () => {
		let callbackCalled = false;
		const process = createProcess('test', [testCommandFactory('foo')], () => ({
			after: () => {
				callbackCalled = true;
			}
		}));
		const processExecutor = process(store);
		processExecutor({});
		assert.isTrue(callbackCalled);
	});

	it('when a command errors, the error and command is returned in the error argument of the callback', async () => {
		const process = createProcess('test', [testCommandFactory('foo'), testErrorCommand], () => ({
			after: (error) => {
				assert.isNotNull(error);
				assert.equal(error && error.error && error.error.message, 'Command Failed');
				assert.strictEqual(error && error.command, testErrorCommand);
			}
		}));
		const processExecutor = process(store);
		await processExecutor({});
	});

	it('a command that does not return results does not break other commands', () => {
		const process = createProcess('test', [testCommandFactory('foo'), testNoop], () => ({
			after: (error) => {
				assert.isNull(error);
				assert.strictEqual(store.get(store.path('foo')), 'foo');
			}
		}));
		const processExecutor = process(store);
		processExecutor({});
	});

	it('executor can be used to programmatically run additional processes', () => {
		const extraProcess = createProcess('test', [testCommandFactory('bar')]);
		const process = createProcess('test', [testCommandFactory('foo')], () => ({
			after: (error, result) => {
				assert.isNull(error);
				let bar = store.get(store.path('bar'));
				assert.isUndefined(bar);
				result.executor(extraProcess, {});
				bar = store.get(store.path('bar'));
				assert.strictEqual(bar, 'bar');
			}
		}));
		const processExecutor = process(store);
		processExecutor({});
	});

	it('process decorator should convert callbacks to after callback', () => {
		let callbackArray: string[] = [];
		const legacyCallbackOne: ProcessCallbackAfter = (error, result) => {
			callbackArray.push('one');
		};
		const legacyCallbackTwo: ProcessCallbackAfter = (error, result) => {
			callbackArray.push('two');
		};

		const decoratorOne = createCallbackDecorator(legacyCallbackOne);
		const decoratorTwo = createCallbackDecorator(legacyCallbackTwo);

		const callbackOne: ProcessCallback = () => ({
			after: (error, result) => {
				callbackArray.push('one');
			}
		});
		const callbackTwo: ProcessCallback = () => ({
			after: (error, result) => {
				callbackArray.push('two');
			}
		});

		const process = createProcess('decorator-test', [], [callbackOne, callbackTwo]);
		const processWithLegacyMiddleware = createProcess(
			'createCallbackDecorator-test',
			[],
			decoratorOne(decoratorTwo())
		);
		const processExecutor = process(store);
		const legacyMiddlewareProcessExecutor = processWithLegacyMiddleware(store);
		processExecutor({});
		assert.deepEqual(callbackArray, ['one', 'two']);
		callbackArray = [];
		legacyMiddlewareProcessExecutor({});
		assert.deepEqual(callbackArray, ['one', 'two']);
	});

	it('Creating a process returned automatically decorates all process callbacks', () => {
		let results: string[] = [];

		const callback: ProcessCallback = () => ({
			after: (error, result): void => {
				results.push('callback one');
			}
		});

		const callbackTwo = () => ({
			after: (error: ProcessError | null, result: ProcessResult): void => {
				results.push('callback two');
				result.payload;
			}
		});

		const logPointerCallback = () => ({
			after: (error: ProcessError | null, result: ProcessResult<{ logs: string[][] }>): void => {
				const paths = result.operations.map((operation) => operation.path.path);
				const logs = result.get(store.path('logs')) || [];

				result.apply([{ op: OperationType.ADD, path: new Pointer(`/logs/${logs.length}`), value: paths }]);
			}
		});

		const createProcess = createProcessFactoryWith([callback, callbackTwo, logPointerCallback]);

		const process = createProcess('test', [testCommandFactory('foo'), testCommandFactory('bar')]);
		const executor = process(store);
		executor({});
		assert.lengthOf(results, 2);
		assert.strictEqual(results[0], 'callback one');
		assert.strictEqual(results[1], 'callback two');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar']]);
		executor({});
		assert.lengthOf(results, 4);
		assert.strictEqual(results[0], 'callback one');
		assert.strictEqual(results[1], 'callback two');
		assert.strictEqual(results[2], 'callback one');
		assert.strictEqual(results[3], 'callback two');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar'], ['/foo', '/bar']]);
	});

	it('Creating a process automatically decorates all process initializers', async () => {
		let initialization: string[] = [];
		let firstCall = true;

		const initializer: ProcessCallback = () => ({
			before: async (payload, store) => {
				initialization.push('initializer one');
				const initLog = store.get(store.path('initLogs')) || [];
				store.apply([
					{ op: OperationType.ADD, path: new Pointer(`/initLogs/${initLog.length}`), value: 'initial value' }
				]);
			}
		});

		const initializerTwo = () => ({
			before: async (payload: any) => {
				initialization.push('initializer two');
				payload.foo;
				await new Promise((resolve) => {
					setTimeout(resolve, 100);
				});
			}
		});

		const initializerThree = () => ({
			before: () => {
				initialization.push('initializer three');
			}
		});

		const logPointerCallback = () => ({
			after: (error: ProcessError | null, result: ProcessResult<{ logs: string[][] }>): void => {
				assert.lengthOf(initialization, firstCall ? 3 : 6);
				firstCall = false;
				const paths = result.operations.map((operation) => operation.path.path);
				const logs = result.get(store.path('logs')) || [];

				result.apply([{ op: OperationType.ADD, path: new Pointer(`/logs/${logs.length}`), value: paths }]);
			}
		});

		const createProcess = createProcessFactoryWith([initializer, initializerTwo, initializerThree]);

		const process = createProcess(
			'test',
			[
				(): PatchOperation[] => {
					assert.lengthOf(initialization, firstCall ? 3 : 6);
					return [];
				},
				testCommandFactory('foo'),
				testCommandFactory('bar')
			],
			logPointerCallback
		);
		const executor = process(store);
		await executor({});
		assert.lengthOf(initialization, 3);
		assert.strictEqual(initialization[0], 'initializer one');
		assert.strictEqual(initialization[1], 'initializer two');
		assert.strictEqual(initialization[2], 'initializer three');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar']]);
		assert.deepEqual(store.get(store.path('initLogs')), ['initial value']);
		await executor({});
		assert.lengthOf(initialization, 6);
		assert.strictEqual(initialization[0], 'initializer one');
		assert.strictEqual(initialization[1], 'initializer two');
		assert.strictEqual(initialization[2], 'initializer three');
		assert.strictEqual(initialization[3], 'initializer one');
		assert.strictEqual(initialization[4], 'initializer two');
		assert.strictEqual(initialization[5], 'initializer three');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar'], ['/foo', '/bar']]);
		assert.deepEqual(store.get(store.path('initLogs')), ['initial value', 'initial value']);
	});

	it('Should work with a single initializer', async () => {
		let initialization: string[] = [];

		const initializer = async () => {
			initialization.push('initializer');
		};

		const logPointerCallback = (error: ProcessError | null, result: ProcessResult<{ logs: string[][] }>): void => {
			const paths = result.operations.map((operation) => operation.path.path);
			const logs = result.get(store.path('logs')) || [];

			result.apply([{ op: OperationType.ADD, path: new Pointer(`/logs/${logs.length}`), value: paths }]);
		};

		const process = createProcess('test', [testCommandFactory('foo'), testCommandFactory('bar')], () => ({
			before: initializer,
			after: logPointerCallback
		}));
		const executor = process(store);
		await executor({});
		assert.lengthOf(initialization, 1);
		assert.strictEqual(initialization[0], 'initializer');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar']]);
		await executor({});
		assert.lengthOf(initialization, 2);
		assert.strictEqual(initialization[0], 'initializer');
		assert.strictEqual(initialization[1], 'initializer');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar'], ['/foo', '/bar']]);
	});

	it('process can be undone using the undo function provided via the callback', () => {
		const command = ({ payload }: CommandRequest): PatchOperation[] => {
			return [{ op: OperationType.REPLACE, path: new Pointer('/foo'), value: 'bar' }];
		};
		const process = createProcess('foo', [testCommandFactory('foo'), command], () => ({
			after: (error, result) => {
				let foo = store.get(result.store.path('foo'));
				assert.strictEqual(foo, 'bar');
				store.apply(result.undoOperations);
				foo = store.get(result.store.path('foo'));
				assert.isUndefined(foo);
			}
		}));
		const processExecutor = process(store);
		return processExecutor({});
	});

	it('Can undo operations for commands that modify the same section of state', () => {
		const commandOne = (): PatchOperation[] => {
			return [{ op: OperationType.REPLACE, path: new Pointer('/state'), value: { b: 'b' } }];
		};
		const commandTwo = (): PatchOperation[] => {
			return [{ op: OperationType.REPLACE, path: new Pointer('/state/a'), value: 'a' }];
		};

		const process = createProcess('foo', [commandOne, commandTwo], () => ({
			after: (error, result) => {
				let state = store.get(result.store.path('state'));
				assert.deepEqual(state, { a: 'a', b: 'b' });
				store.apply(result.undoOperations);
				state = store.get(result.store.path('state'));
				assert.isUndefined(state);
			}
		}));
		const processExecutor = process(store);
		return processExecutor({});
	});

	it('Can undo operations for commands that return multiple operations', () => {
		const commandFactory = createCommandFactory<any>();
		const commandOne = commandFactory(({ path }) => {
			return [
				replace(path('state'), {}),
				replace(path('state', 'foo'), 'foo'),
				replace(path('state', 'bar'), 'bar'),
				replace(path('state', 'baz'), 'baz')
			];
		});

		const process = createProcess('foo', [commandOne], () => ({
			after: (error, result) => {
				let state = store.get(result.store.path('state'));
				assert.deepEqual(state, { foo: 'foo', bar: 'bar', baz: 'baz' });
				store.apply(result.undoOperations);
				state = store.get(result.store.path('state'));
				assert.isUndefined(state);
			}
		}));
		const processExecutor = process(store);
		return processExecutor({});
	});
});
