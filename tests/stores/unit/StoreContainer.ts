const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../src/widget-core/WidgetBase';
import { w, v } from '../../../src/widget-core/d';
import harness from '../../../src/testing/harness';

import DefaultStoreContainer, { createStoreContainer, StoreContainer } from '../../../src/stores/StoreContainer';

interface State {
	foo: string;
	bar: string;
}

const TypedStoreContainer = createStoreContainer<State>();

describe('StoreContainer', () => {
	describe('Default StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase<{ key: string }> {}
			class FooContainer extends DefaultStoreContainer<State>(Foo, 'state', {
				getProperties: (inject, properties) => {
					return properties;
				}
			}) {
				render() {
					return super.render();
				}
			}
			const h = harness(() => w(FooContainer, { key: '1' }, [v('div')]));
			h.expect(() => w(Foo, { key: '1' }, [v('div')]));
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
			const h = harness(() => w(FooContainer, {}));
			invalidateCounter = 0;
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 1);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 2);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 3);
			h.expect(() => w(Foo, {}));
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
			const h = harness(() => w(FooContainer, { key: '1' }, [v('div')]));
			h.expect(() => w(Foo, { key: '1' }, [v('div')]));
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
			const h = harness(() => w(FooContainer, {}));
			invalidateCounter = 0;
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 1);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 2);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 3);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 4);
		});
	});

	describe('Typed StoreContainer', () => {
		it('Should render the WNode with the properties and children', () => {
			class Foo extends WidgetBase<{ key: string }> {}
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
			const h = harness(() => w(FooContainer, { key: '1' }, [v('div')]));
			h.expect(() => w(Foo, { key: '1' }, [v('div')]));
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
			const h = harness(() => w(FooContainer, {}));
			invalidateCounter = 0;
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 1);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 2);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 3);
			h.expect(() => w(Foo, {}));
			assert.strictEqual(invalidateCounter, 4);
		});
	});
});
