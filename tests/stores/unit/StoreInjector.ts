const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy } from 'sinon';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, WNODE } from '@dojo/widget-core/d';
import { Registry } from '@dojo/widget-core/Registry';

import { StoreInjector, createStoreContainer, storeInject } from './../../src/StoreInjector';
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

const StoreContainer = createStoreContainer<State>();

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

	describe('StoreInjector', () => {
		it('should emit invalidate when the store invalidates', () => {
			let invalidateEmitted = false;
			const injector = new StoreInjector(store);
			injector.on('invalidate', () => {
				invalidateEmitted = true;
			});
			store.emit({ type: 'invalidate' });
			assert.isTrue(invalidateEmitted);
		});

		it('should emit invalidate when the registered state in store changes', () => {
			let invalidateEmitted = false;
			const injector = new StoreInjector(store);
			injector.onChange([['foo']], () => {
				invalidateEmitted = true;
			});
			barProcess(store)({});
			assert.isFalse(invalidateEmitted);
			fooProcess(store)({});
			assert.isTrue(invalidateEmitted);
		});
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
			registry.defineInjector('state', new StoreInjector(store));
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
			registry.defineInjector('state', new StoreInjector(store));
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
	});

	describe('StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase {}
			class FooContainer extends StoreContainer(Foo, 'state', { getProperties: () => {} }) {
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
			class FooContainer extends StoreContainer(Foo, 'state', { getProperties: () => {} }) {
				invalidate() {
					invalidateCounter++;
				}
			}
			const fooContainer = new FooContainer();
			registry.defineInjector('state', new StoreInjector(store));
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
