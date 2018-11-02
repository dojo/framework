const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { v, w } from '../../../src/widget-core/d';
import { Registry } from '../../../src/widget-core/Registry';

import { StoreProvider } from '../../../src/stores/StoreProvider';
import { createCommandFactory, createProcess, Process } from '../../../src/stores/process';
import { replace } from '../../../src/stores/state/operations';
import { Store } from '../../../src/stores/Store';
import harness from '../../../src/testing/harness';

interface State {
	foo: string;
	bar: string;
	qux: {
		baz: number;
		foobar: number;
		bar: {
			foo: {
				foobar: {
					baz: {
						barbaz: {
							res: number;
						};
					};
				};
			};
		};
	};
}

const commandFactory = createCommandFactory<State>();
const fooCommand = commandFactory(({ get, path }) => {
	const currentFoo = get(path('foo')) || '';
	return [replace(path('foo'), `${currentFoo}foo`)];
});
const barCommand = commandFactory(({ get, path }) => {
	const currentFoo = get(path('bar'));
	return [replace(path('bar'), `${currentFoo}bar`)];
});
const bazCommand = commandFactory(({ get, path }) => {
	const currentBaz = get(path('qux', 'baz')) || 0;
	return [replace(path('qux', 'baz'), currentBaz + 1)];
});
const quxCommand = commandFactory(({ get, path }) => {
	return [replace(path('qux'), { baz: 100 })];
});
const fooBarCommand = commandFactory(({ get, path }) => {
	const currentFooBar = get(path('qux', 'foobar')) || 0;
	return [replace(path('qux', 'foobar'), currentFooBar)];
});
const deepCommand = commandFactory(({ get, path }) => {
	return [replace(path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res'), 0)];
});

describe('StoreProvider', () => {
	let store: Store<State>;
	let registry: Registry;
	let fooProcess: Process;
	let barProcess: Process;
	let bazProcess: Process;
	let quxProcess: Process;
	let fooBarProcess: Process;
	let deepProcess: Process;

	beforeEach(() => {
		registry = new Registry();
		store = new Store<State>();
		registry.defineInjector('state', () => () => store);
		fooProcess = createProcess('foo', [fooCommand]);
		barProcess = createProcess('bar', [barCommand]);
		bazProcess = createProcess('baz', [bazCommand]);
		quxProcess = createProcess('qux', [quxCommand]);
		fooBarProcess = createProcess('foobar', [fooBarCommand]);
		deepProcess = createProcess('deep', [deepCommand]);
	});

	describe('invalidate', () => {
		let invalidateCount = 0;
		let TestContainer: new (...args: any[]) => StoreProvider<State>;

		beforeEach(() => {
			invalidateCount = 0;
			TestContainer = class extends StoreProvider<State> {
				invalidate() {
					invalidateCount++;
				}
			};
		});

		it('should connect to the stores generally invalidate', () => {
			harness(
				() =>
					w(TestContainer, {
						stateKey: 'state',
						renderer(injectedStore: any) {
							assert.strictEqual<any>(injectedStore, store);
							return v('div');
						}
					}),
				{ registry }
			);
			invalidateCount = 0;
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 3);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 4);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 5);
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 6);
		});

		it('should connect to the stores for paths', () => {
			harness(
				() =>
					w(TestContainer, {
						paths: (path: any) => {
							return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
						},
						stateKey: 'state',
						renderer(injectedStore: any) {
							assert.strictEqual<any>(injectedStore, store);
							return v('div');
						}
					}),
				{ registry }
			);
			invalidateCount = 0;
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
		});

		it('should re-connect to the store when paths change', () => {
			let properties: any = {
				paths: (path: any) => {
					return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
				},
				stateKey: 'state',
				renderer(injectedStore: any) {
					assert.strictEqual<any>(injectedStore, store);
					return v('div');
				}
			};
			const h = harness(() => w(TestContainer, properties), { registry });
			invalidateCount = 0;
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			properties = {
				paths: (path: any) => {
					return [path('foo')];
				},
				stateKey: 'state',
				renderer(injectedStore: any) {
					assert.strictEqual<any>(injectedStore, store);
					return v('div');
				}
			};
			h.expect(() => v('div'));
			invalidateCount = 0;
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 0);
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
		});

		it('should re-connect to the entire store paths are not passed', () => {
			let properties: any = {
				paths: (path: any) => {
					return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
				},
				stateKey: 'state',
				renderer(injectedStore: any) {
					assert.strictEqual<any>(injectedStore, store);
					return v('div');
				}
			};
			const h = harness(() => w(TestContainer, properties), { registry });
			invalidateCount = 0;
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			properties = {
				stateKey: 'state',
				renderer(injectedStore: any) {
					assert.strictEqual<any>(injectedStore, store);
					return v('div');
				}
			};
			h.expect(() => v('div'));
			invalidateCount = 0;
			deepProcess(store)({});
			assert.strictEqual(invalidateCount, 1);
			fooProcess(store)({});
			assert.strictEqual(invalidateCount, 2);
			barProcess(store)({});
			assert.strictEqual(invalidateCount, 3);
			bazProcess(store)({});
			assert.strictEqual(invalidateCount, 4);
			quxProcess(store)({});
			assert.strictEqual(invalidateCount, 5);
			fooBarProcess(store)({});
			assert.strictEqual(invalidateCount, 6);
		});
	});

	it('should return the result of the renderer', () => {
		const h = harness(
			() =>
				w(StoreProvider, {
					stateKey: 'state',
					renderer(injectedStore: any) {
						assert.strictEqual<any>(injectedStore, store);
						return v('div');
					}
				}),
			{ registry }
		);
		h.expect(() => v('div'));
	});

	it('should return undefined is the store is not available in the registry', () => {
		const h = harness(
			() =>
				w(StoreProvider, {
					stateKey: 'other-state',
					renderer(injectedStore: any) {
						assert.strictEqual<any>(injectedStore, store);
						return v('div');
					}
				}),
			{ registry }
		);
		h.expect(() => null);
	});
});
