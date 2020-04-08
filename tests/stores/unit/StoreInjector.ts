const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy } from 'sinon';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { v } from '../../../src/core/vdom';
import { Registry } from '../../../src/core/Registry';

import {
	createStoreContainer,
	storeInject,
	StoreContainer,
	registerStoreInjector
} from '../../../src/stores/StoreInjector';
import { Store } from '../../../src/stores/Store';
import { createCommandFactory, createProcess, Process } from '../../../src/stores/process';
import { replace } from '../../../src/stores/state/operations';

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

const TypedStoreContainer = createStoreContainer<State>();

describe('StoreInjector', () => {
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
		fooProcess = createProcess('foo', [fooCommand]);
		barProcess = createProcess('bar', [barCommand]);
		bazProcess = createProcess('baz', [bazCommand]);
		quxProcess = createProcess('qux', [quxCommand]);
		fooBarProcess = createProcess('foobar', [fooBarCommand]);
		deepProcess = createProcess('deep', [deepCommand]);
	});

	describe('storeInject', () => {
		it('Should invalidate every time the payload invalidate when no path is passed', () => {
			@storeInject<State>({
				name: 'state',
				getProperties: (store) => {
					return {
						foo: store.get(store.path('foo'))
					};
				}
			})
			class TestWidget extends WidgetBase<any> {}
			const widget = new TestWidget();
			registry.defineInjector('state', () => () => store);
			widget.registry.base = registry;
			widget.__setProperties__({});
			const invalidateSpy = spy(widget, 'invalidate');
			assert.strictEqual(widget.properties.foo, undefined);
			fooProcess(store)({});
			assert.isTrue(invalidateSpy.calledOnce);
			widget.__setProperties__({});
			assert.isTrue(invalidateSpy.calledTwice);
			assert.strictEqual(widget.properties.foo, 'foo');
			barProcess(store)({});
			assert.isTrue(invalidateSpy.calledThrice);
		});

		it('Should only invalidate when the path passed is changed', () => {
			@storeInject<State>({
				name: 'state',
				paths: [['foo']],
				getProperties: (store) => {
					return {
						foo: store.get(store.path('foo'))
					};
				}
			})
			class TestWidget extends WidgetBase<any> {}
			const widget = new TestWidget();
			registry.defineInjector('state', () => () => store);
			widget.registry.base = registry;
			widget.__setProperties__({});
			const invalidateSpy = spy(widget, 'invalidate');
			assert.strictEqual(widget.properties.foo, undefined);
			fooProcess(store)({});
			assert.isTrue(invalidateSpy.calledOnce);
			widget.__setProperties__({});
			assert.isTrue(invalidateSpy.calledTwice);
			assert.strictEqual(widget.properties.foo, 'foo');
			barProcess(store)({});
			assert.isTrue(invalidateSpy.calledTwice);
		});

		it('Should only invalidate when the path passed is changed using path function', () => {
			@storeInject<State>({
				name: 'state',
				paths: (path) => {
					return [path('qux', 'baz'), path(path('qux', 'bar', 'foo', 'foobar', 'baz'), 'barbaz', 'res')];
				},
				getProperties: (store) => {
					return {
						baz: store.get(store.path('qux', 'baz'))
					};
				}
			})
			class TestWidget extends WidgetBase<any> {}
			const widget = new TestWidget();
			registry.defineInjector('state', () => () => store);
			widget.registry.base = registry;
			widget.__setProperties__({});
			const invalidateSpy = spy(widget, 'invalidate');
			assert.strictEqual(widget.properties.foo, undefined);
			bazProcess(store)({});
			assert.isTrue(invalidateSpy.calledOnce);
			widget.__setProperties__({});
			assert.isTrue(invalidateSpy.calledTwice);
			assert.strictEqual(widget.properties.baz, 1);
			barProcess(store)({});
			assert.isTrue(invalidateSpy.calledTwice);
			quxProcess(store)({});
			assert.isTrue(invalidateSpy.calledThrice);
			fooBarProcess(store)({});
			assert.isTrue(invalidateSpy.calledThrice);
			deepProcess(store)({});
			assert.strictEqual(invalidateSpy.callCount, 4);
		});

		it('invalidate listeners are removed when widget is destroyed', () => {
			let invalidateCounter = 0;
			@storeInject<State>({
				name: 'state',
				getProperties: (store) => {
					return {
						foo: store.get(store.path('foo'))
					};
				}
			})
			class TestWidget extends WidgetBase<any> {
				destroy() {
					super.destroy();
				}
				invalidate() {
					invalidateCounter++;
					super.invalidate();
				}
			}
			const widget = new TestWidget();
			registry.defineInjector('state', () => () => store);
			widget.registry.base = registry;
			widget.__setProperties__({});
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 2);
			barProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
			widget.destroy();
			barProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
		});

		it('path based invalidate listeners are removed when widget is destroyed', () => {
			let invalidateCounter = 0;
			@storeInject<State>({
				name: 'state',
				paths: [['foo']],
				getProperties: (store) => {
					return {
						foo: store.get(store.path('foo'))
					};
				}
			})
			class TestWidget extends WidgetBase<any> {
				destroy() {
					super.destroy();
				}
				invalidate() {
					invalidateCounter++;
					super.invalidate();
				}
			}
			const widget = new TestWidget();
			registry.defineInjector('state', () => () => store);
			widget.registry.base = registry;
			widget.__setProperties__({});
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 2);
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
			widget.destroy();
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
		});
	});

	describe('registerStoreInjector', () => {
		it('should register store with default key `state`', () => {
			const registry = new Registry();
			const store = new Store();
			const returnedRegistry = registerStoreInjector(store, { registry });
			assert.strictEqual(registry, returnedRegistry);
			const item = registry.getInjector<Store>('state');
			assert.strictEqual(item!.injector(), store);
		});

		it('should register store with custom key', () => {
			const registry = new Registry();
			const store = new Store();
			const returnedRegistry = registerStoreInjector(store, { registry, key: 'custom' });
			assert.strictEqual(registry, returnedRegistry);
			const item = registry.getInjector<Store>('custom');
			assert.strictEqual(item!.injector(), store);
		});

		it('should create registry, register store and return the register when registry is not provided', () => {
			const store = new Store();
			const returnedRegistry = registerStoreInjector(store);
			const item = returnedRegistry.getInjector<Store>('state');
			assert.strictEqual(item!.injector(), store);
		});

		it('should throw an error if an injector has already been registered for the given key', () => {
			const registry = new Registry();
			const store = new Store();
			registry.defineInjector('state', () => {
				return () => store;
			});
			assert.throws(
				() => registerStoreInjector(store, { registry }),
				'Store has already been defined for key state'
			);
		});
	});

	describe('StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase {}
			class FooContainer extends StoreContainer<State>(Foo, 'state', {
				getProperties: (inject, props) => {
					return props;
				}
			}) {
				render() {
					return super.render();
				}
			}
			const fooContainer = new FooContainer();
			fooContainer.__setProperties__({ key: '1' });
			const child = v('div');
			fooContainer.__setChildren__([child]);
			const renderResult = fooContainer.render();
			assert.deepEqual(renderResult, {
				properties: { key: '1' },
				children: [child],
				type: '__WNODE_TYPE',
				widgetConstructor: Foo
			});
		});

		it('Should always render a container', () => {
			let invalidateCounter = 0;
			class Foo extends WidgetBase {}
			class FooContainer extends StoreContainer<State>(Foo, 'state', {
				getProperties: (inject, props) => {
					return props;
				}
			}) {
				invalidate() {
					invalidateCounter++;
				}
			}
			const fooContainer = new FooContainer();
			registry.defineInjector('state', () => () => store);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 1);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 2);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 3);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 4);
		});
	});

	describe('Typed StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase {}
			class FooContainer extends TypedStoreContainer(Foo, 'state', {
				getProperties: (inject, props) => {
					return props;
				}
			}) {
				render() {
					return super.render();
				}
			}
			const fooContainer = new FooContainer();
			fooContainer.__setProperties__({ key: '1' });
			const child = v('div');
			fooContainer.__setChildren__([child]);
			const renderResult = fooContainer.render();
			assert.deepEqual(renderResult, {
				properties: { key: '1' },
				children: [child],
				type: '__WNODE_TYPE',
				widgetConstructor: Foo
			});
		});

		it('Should always render a container', () => {
			let invalidateCounter = 0;
			class Foo extends WidgetBase {}
			class FooContainer extends TypedStoreContainer(Foo, 'state', {
				getProperties: (inject, props) => {
					return props;
				}
			}) {
				invalidate() {
					invalidateCounter++;
				}
			}
			const fooContainer = new FooContainer();
			registry.defineInjector('state', () => () => store);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 1);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 2);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 3);
			fooContainer.__setProperties__({});
			assert.strictEqual(invalidateCounter, 4);
		});
	});
});
