const { beforeEach, describe, it } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { Registry } from '../../../src/core/Registry';

import { StoreProvider } from '../../../src/stores/StoreProvider';
import { createCommandFactory, createProcess, Process } from '../../../src/stores/process';
import { replace } from '../../../src/stores/state/operations';
import { Store } from '../../../src/stores/Store';
import { VNode } from '../../../src/core/interfaces';
import { WidgetBase } from '../../../src/core/WidgetBase';
import renderer, { v, w } from '../../../src/core/vdom';

interface State {
	foo: string;
	bar: string;
	qux: {
		baz: number;
		foobar?: number;
		bar?: {
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

	it('should connect to the stores generally invalidate', () => {
		let invalidateCount = 0;
		class TestContainer extends StoreProvider<State> {
			invalidate() {
				invalidateCount++;
			}
		}
		const container = new TestContainer();
		container.registry.base = registry;
		container.__setProperties__({
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
		container.__render__();
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
		let invalidateCount = 0;
		class TestContainer extends StoreProvider<State> {
			invalidate() {
				invalidateCount++;
			}
		}
		const container = new TestContainer();
		container.registry.base = registry;
		container.__setProperties__({
			paths: (path) => {
				return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
			},
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
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
		let invalidateCount = 0;
		class TestContainer extends StoreProvider<State> {
			invalidate() {
				invalidateCount++;
			}
		}
		const container = new TestContainer();
		container.registry.base = registry;
		container.__setProperties__({
			paths: (path) => {
				return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
			},
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
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
		container.__setProperties__({
			paths: (path) => {
				return [path('foo')];
			},
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
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
		let invalidateCount = 0;
		class TestContainer extends StoreProvider<State> {
			invalidate() {
				invalidateCount++;
			}
		}
		const container = new TestContainer();
		container.registry.base = registry;
		container.__setProperties__({
			paths: (path) => {
				return [path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
			},
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
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
		container.__setProperties__({
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
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

	it('should return the result of the renderer', () => {
		const container = new StoreProvider();
		container.registry.base = registry;
		container.__setProperties__({
			stateKey: 'state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
		const result = container.__render__() as VNode;
		assert.deepEqual(result.properties, {});
		assert.isUndefined(result.children);
		assert.strictEqual(result.tag, 'div');
	});

	it('should return undefined is the store is not available in the registry', () => {
		const container = new StoreProvider();
		container.registry.base = registry;
		container.__setProperties__({
			stateKey: 'other-state',
			renderer(injectedStore) {
				assert.strictEqual<any>(injectedStore, store);
				return v('div');
			}
		});
		const result = container.__render__() as VNode;
		assert.isUndefined(result);
	});

	jsdomDescribe('integration', () => {
		it('should always render', () => {
			let invalidate: any;

			class App extends WidgetBase {
				private _value = 'first';
				constructor() {
					super();
					invalidate = this.update;
				}

				update = () => {
					this._value = 'second';
					this.invalidate();
				};

				render() {
					return w(StoreProvider, {
						stateKey: 'state',
						renderer: () => {
							return this._value;
						}
					});
				}
			}

			const root = document.createElement('root');

			const r = renderer(() => w(App, {}));
			r.mount({ domNode: root, registry, sync: true });
			assert.strictEqual(root.outerHTML, '<root>first</root>');
			invalidate();
			assert.strictEqual(root.outerHTML, '<root>second</root>');
		});
	});
});
