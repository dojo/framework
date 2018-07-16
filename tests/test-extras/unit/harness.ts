const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from './../../src/harness';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w, isVNode } from '@dojo/widget-core/d';
import Set from '@dojo/shim/Set';
import Map from '@dojo/shim/Map';
import { VNode, WNode } from '@dojo/widget-core/interfaces';

const noop: any = () => {};

class ChildWidget extends WidgetBase<any> {}

class MyWidget extends WidgetBase {
	_count = 0;
	_onclick() {
		this._count++;
		this.invalidate();
	}

	_otherOnClick(count: any = 50) {
		this._count = count;
		this.invalidate();
	}

	_widgetFunction() {
		return 'result';
	}

	// prettier-ignore
	protected render() {
		return v('div', { classes: ['root', 'other'], onclick: this._otherOnClick }, [
			v('span', {
				key: 'span',
				classes: 'span',
				style: 'width: 100px',
				id: 'random-id',
				onclick: this._onclick
			}, [
				`hello ${this._count}`
			]),
			w(ChildWidget, { key: 'widget', id: 'random-id', func: this._widgetFunction }),
			w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
		]);
	}
}

class MyDeferredWidget extends WidgetBase {
	// prettier-ignore
	protected render() {
		return v('div', (inserted: boolean) => {
			return { classes: ['root', 'other'], styles: { marginTop: '100px' } };
		});
	}
}

class ArrayWidget extends WidgetBase {
	_count = 0;
	_onclick() {
		this._count++;
		this.invalidate();
	}

	_otherOnClick(count: any = 50) {
		this._count = count;
		this.invalidate();
	}

	// prettier-ignore
	protected render() {
		return [
			v('span', {
				key: 'span',
				classes: 'span',
				style: 'width: 100px',
				id: 'random-id',
				onclick: this._onclick
			}, [
				`hello ${this._count}`
			]),
			w(ChildWidget, { key: 'widget', id: 'random-id' }),
			w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
		];
	}
}

describe('harness', () => {
	describe('widget with a single top level DNode', () => {
		it('expect', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('expect partial for VNode', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expectPartial('*[key="span"]', () =>
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				])
			);
		});

		it('Should support deferred properties', () => {
			const h = harness(() => w(MyDeferredWidget, {}));
			h.expect(() => v('div', { classes: ['root', 'other'], styles: { marginTop: '100px' } }));
		});

		it('expect partial for WNode constructor', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expectPartial('*[key="widget"]', () => w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }));
		});

		it('expect partial for WNode registry item', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expectPartial('*[key="registry"]', () =>
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			);
		});

		it('trigger by tag', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			h.trigger('div', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 50']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			h.trigger('div', 'onclick', 100);
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 100']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by class', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('.span', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by class from classes array', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('.root', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 50']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by nested selector', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('.root span', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger without expect', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('*[key="span"]', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by key selector', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			h.trigger('*[key="span"]', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger with non matching selector', () => {
			const h = harness(() => w(MyWidget, {}));
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			h.trigger('*[key="other"]', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by pseudo selector', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('div :first-child', 'onclick');
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger by functional selector', () => {
			const h = harness(() => w(MyWidget, {}));
			h.trigger('*[key="span"]', (node: WNode | VNode) => {
				if (isVNode(node)) {
					return node.properties.onclick;
				}
			});
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 1']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('trigger returns the result of the function', () => {
			const h = harness(() => w(MyWidget, {}));
			const result = h.trigger('@widget', 'func');
			assert.strictEqual(result, 'result');
		});

		it('Should be able to get the last render', () => {
			const h = harness(() => w(MyWidget, {}));
			const lastRender = h.getRender();
			assert.strictEqual(lastRender, h.getRender());
		});

		it('Should be able to get render by count', () => {
			const h = harness(() => w(MyWidget, {}));
			const lastRender = h.getRender(0);
			assert.strictEqual(lastRender, h.getRender());
		});

		it('should be able to pass actual render function', () => {
			const h = harness(() => w(MyWidget, {}));
			const lastRender = h.getRender();
			h.expect(
				() =>
					v('div', { classes: ['root', 'other'], onclick: () => {} }, [
						v(
							'span',
							{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
							['hello 0']
						),
						w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
						w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
					]),
				() => lastRender
			);
		});

		it('custom compare for VNode', () => {
			const h = harness(() => w(MyWidget, {}), [
				{
					selector: '*[key="span"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v('span', { key: 'span', id: '', classes: 'span', style: 'width: 100px', onclick: () => {} }, [
						'hello 0'
					]),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('custom compare for constructor WNode', () => {
			const h = harness(() => w(MyWidget, {}), [
				{
					selector: '*[key="widget"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', id: 'random-id', classes: 'span', style: 'width: 100px', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: '', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
		});

		it('custom compare for registry item WNode', () => {
			const h = harness(() => w(MyWidget, {}), [
				{
					selector: '*[key="registry"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', id: 'random-id', classes: 'span', style: 'width: 100px', onclick: () => {} },
						['hello 0']
					),
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: '' })
				])
			);
		});

		it('Support Maps and Sets in properties', () => {
			class Bar extends WidgetBase<{ foo: Map<any, any>; bar: Set<any> }> {}
			class Foo extends WidgetBase<{ foo: Map<any, any>; bar: Set<any> }> {
				render() {
					const { foo, bar } = this.properties;
					return w(Bar, { foo, bar });
				}
			}
			const bar = new Set();
			bar.add('foo');
			const foo = new Map();
			foo.set('a', 'a');
			const h = harness(() => w(Foo, { foo, bar }));
			h.expect(() => w(Bar, { foo, bar }));
		});
	});

	describe('widget with an array of DNodes', () => {
		it('expect', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('expect partial for VNode', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expectPartial('*[key="span"]', () =>
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				])
			);
		});

		it('expect partial for WNode constructor', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expectPartial('*[key="widget"]', () => w(ChildWidget, { key: 'widget', id: 'random-id' }));
		});

		it('expect partial for WNode registry item', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expectPartial('*[key="registry"]', () =>
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			);
		});

		it('trigger by tag', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
			h.trigger('span', 'onclick');
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 1'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('trigger by class', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.trigger('.span', 'onclick');
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 1'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('trigger by key selector', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
			h.trigger('*[key="span"]', 'onclick');
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 1'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('trigger with non matching selector', () => {
			const h = harness(() => w(ArrayWidget, {}));
			h.trigger('*[key="other"]', 'onclick');
			h.expect(() => [
				v('span', { key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('custom compare for VNode', () => {
			const h = harness(() => w(ArrayWidget, {}), [
				{
					selector: '*[key="span"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() => [
				v('span', { key: 'span', id: '', classes: 'span', style: 'width: 100px', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('custom compare for constructor WNode', () => {
			const h = harness(() => w(ArrayWidget, {}), [
				{
					selector: '*[key="widget"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() => [
				v('span', { key: 'span', id: 'random-id', classes: 'span', style: 'width: 100px', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: '' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
			]);
		});

		it('custom compare for registry item WNode', () => {
			const h = harness(() => w(ArrayWidget, {}), [
				{
					selector: '*[key="registry"]',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() => [
				v('span', { key: 'span', id: 'random-id', classes: 'span', style: 'width: 100px', onclick: () => {} }, [
					'hello 0'
				]),
				w(ChildWidget, { key: 'widget', id: 'random-id' }),
				w<ChildWidget>('registry-item', { key: 'registry', id: '' })
			]);
		});
	});
});
