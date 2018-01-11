const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Pointer } from './../../src/state/Pointer';
import { OperationType, PatchOperation } from './../../src/state/Patch';
import {
	CommandRequest,
	createCallbackDecorator,
	createCommandFactory,
	createProcess,
	createProcessFactoryWith,
	ProcessCallback,
	ProcessError,
	ProcessResult
} from './../../src/process';
import { Store } from './../../src/Store';

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

const testErrorCommand = ({ payload }: CommandRequest): any => {
	new Error('Command Failed');
};

describe('process', () => {
	beforeEach(() => {
		store = new Store();
		promises = [];
		promiseResolvers = [];
	});

	it('with synchronous commands running in order', () => {
		const process = createProcess([testCommandFactory('foo'), testCommandFactory('foo/bar')]);
		const processExecutor = process(store);
		processExecutor({});
		const foo = store.get(store.path('foo'));
		const foobar = store.get(store.path('foo', 'bar'));
		assert.deepEqual(foo, { bar: 'foo/bar' });
		assert.strictEqual(foobar, 'foo/bar');
	});

	it('processes wait for asynchronous commands to complete before continuing', () => {
		const process = createProcess([
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

	it('support concurrent commands executed synchronously', () => {
		const process = createProcess([
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
		const process = createProcess([
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
		const process = createProcess<any, { foo: string }>([
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
		const processOne = createProcess<any, { foo: string; bar: string }>([commandOne, commandTwo]);
		// createProcess([commandOne, commandTwo]); // shouldn't compile
		// createProcess<any, { bar: string }>([commandOne]); // shouldn't compile
		const processTwo = createProcess([commandTwo]);
		const processThree = createProcess([commandThree]);
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

		const processOne = createProcess([commandOne]);
		const processTwo = createProcess<any, { bar: number; foo: number }>([commandOne, commandTwo]);
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
		const process = createProcess([testCommandFactory('foo')], {
			callback: () => {
				callbackCalled = true;
			}
		});
		const processExecutor = process(store);
		processExecutor({});
		assert.isTrue(callbackCalled);
	});

	it('when a command errors, the error and command is returned in the error argument of the callback', () => {
		const process = createProcess([testCommandFactory('foo'), testErrorCommand], {
			callback: (error) => {
				assert.isNotNull(error);
				assert.strictEqual(error && error.command, testErrorCommand);
			}
		});
		const processExecutor = process(store);
		processExecutor({});
	});

	it('executor can be used to programmatically run additional processes', () => {
		const extraProcess = createProcess([testCommandFactory('bar')]);
		const process = createProcess([testCommandFactory('foo')], {
			callback: (error, result) => {
				assert.isNull(error);
				let bar = store.get(store.path('bar'));
				assert.isUndefined(bar);
				result.executor(extraProcess, {});
				bar = store.get(store.path('bar'));
				assert.strictEqual(bar, 'bar');
			}
		});
		const processExecutor = process(store);
		processExecutor({});
	});

	it('process can be undone using the undo function provided via the callback', () => {
		const process = createProcess([testCommandFactory('foo')], {
			callback: (error, result) => {
				let foo = store.get(store.path('foo'));
				assert.strictEqual(foo, 'foo');
				result.undo();
				foo = store.get(store.path('foo'));
				assert.isUndefined(foo);
			}
		});
		const processExecutor = process(store);
		processExecutor({});
	});

	it('Creating a process returned automatically decorates all process callbacks', () => {
		let results: string[] = [];

		const callbackDecorator = (callback?: ProcessCallback): ProcessCallback => {
			return (error, result): void => {
				results.push('callback one');
				callback && callback(error, result);
			};
		};

		const callbackTwo = (error: ProcessError | null, result: ProcessResult): void => {
			results.push('callback two');
			result.payload;
		};

		const logPointerCallback = (error: ProcessError | null, result: ProcessResult<{ logs: string[][] }>): void => {
			const paths = result.operations.map((operation) => operation.path.path);
			const logs = result.get(store.path('logs')) || [];

			result.apply([{ op: OperationType.ADD, path: new Pointer(`/logs/${logs.length}`), value: paths }]);
		};

		const createProcess = createProcessFactoryWith([
			callbackDecorator,
			createCallbackDecorator(callbackTwo),
			createCallbackDecorator(logPointerCallback)
		]);

		const process = createProcess([testCommandFactory('foo'), testCommandFactory('bar')]);
		const executor = process(store);
		executor({});
		assert.lengthOf(results, 2);
		assert.strictEqual(results[0], 'callback two');
		assert.strictEqual(results[1], 'callback one');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar']]);
		executor({});
		assert.lengthOf(results, 4);
		assert.strictEqual(results[0], 'callback two');
		assert.strictEqual(results[1], 'callback one');
		assert.strictEqual(results[2], 'callback two');
		assert.strictEqual(results[3], 'callback one');
		assert.deepEqual(store.get(store.path('logs')), [['/foo', '/bar'], ['/foo', '/bar']]);
	});
});
