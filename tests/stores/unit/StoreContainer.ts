const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, WNODE } from '@dojo/widget-core/d';
import { Registry } from '@dojo/widget-core/Registry';

import DefaultStoreContainer, { createStoreContainer, StoreContainer } from './../../src/StoreContainer';
import { Store } from './../../src/Store';

interface State {
	foo: string;
	bar: string;
}

const TypedStoreContainer = createStoreContainer<State>();

describe('StoreContainer', () => {
	let store: Store<State>;
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry();
		store = new Store<State>();
	});

	describe('Default StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase<{ foo: string }> {}
			class FooContainer extends DefaultStoreContainer<State>(Foo, 'state', {
				getProperties: (inject, properties) => {
					return properties;
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
				type: WNODE,
				widgetConstructor: Foo
			});
		});

		it('Should always render a container', () => {
			let invalidateCounter = 0;
			class Foo extends WidgetBase {}
			class FooContainer extends DefaultStoreContainer<State>(Foo, 'state', {
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
				type: WNODE,
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
			class Foo extends WidgetBase<{ foo: string }> {}
			class FooContainer extends TypedStoreContainer(Foo, 'state', {
				getProperties: (inject, properties) => {
					properties;
					return properties;
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
				type: WNODE,
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
