const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy } from 'sinon';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, WNODE } from '@dojo/widget-core/d';
import { Registry } from '@dojo/widget-core/Registry';

import { createStoreContainer, storeInject, StoreContainer, registerStoreInjector } from './../../src/StoreInjector';
import { Store } from './../../src/Store';
import { createCommandFactory, createProcess, Process } from '../../src/process';
import { replace } from '../../src/state/operations';

interface State {
	foo: string;
	bar: string;
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

const TypedStoreContainer = createStoreContainer<State>();

describe('StoreInjector', () => {
	let store: Store<State>;
	let registry: Registry;
	let fooProcess: Process;
	let barProcess: Process;

	beforeEach(() => {
		registry = new Registry();
		store = new Store<State>();
		fooProcess = createProcess('foo', [fooCommand]);
		barProcess = createProcess('bar', [barCommand]);
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
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
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
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
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
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
			barProcess(store)({});
			assert.strictEqual(invalidateCounter, 4);
			widget.destroy();
			barProcess(store)({});
			assert.strictEqual(invalidateCounter, 4);
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
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 3);
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 4);
			widget.destroy();
			fooProcess(store)({});
			assert.strictEqual(invalidateCounter, 4);
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
				getProperties: (inject: Store<State>) => {}
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
				type: WNODE,
				widgetConstructor: Foo
			});
		});

		it('Should always render a container', () => {
			let invalidateCounter = 0;
			class Foo extends WidgetBase {}
			class FooContainer extends StoreContainer<State>(Foo, 'state', {
				getProperties: (inject: Store<State>) => {}
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
				getProperties: (inject: Store<State>) => {}
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
				type: WNODE,
				widgetConstructor: Foo
			});
		});

		it('Should always render a container', () => {
			let invalidateCounter = 0;
			class Foo extends WidgetBase {}
			class FooContainer extends TypedStoreContainer(Foo, 'state', {
				getProperties: (inject: Store<State>) => {}
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
