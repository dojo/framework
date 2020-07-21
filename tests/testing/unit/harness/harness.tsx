const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from '../../../../src/testing/harness/harness';
import { WidgetBase } from '../../../../src/core/WidgetBase';
import { v, w, isVNode, tsx, create, diffProperty, invalidator } from '../../../../src/core/vdom';
import Set from '../../../../src/shim/Set';
import Map from '../../../../src/shim/Map';
import { VNode, WNode, WidgetProperties } from '../../../../src/core/interfaces';
import icache from '../../../../src/core/middleware/icache';

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

		it('Should support widgets that have typed children', () => {
			class WidgetWithTypedChildren extends WidgetBase<WidgetProperties, WNode<MyDeferredWidget>> {}
			const h = harness(() => w(WidgetWithTypedChildren, {}, [w(MyDeferredWidget, {})]));
			h.expect(() => v('div', [w(MyDeferredWidget, {})]));
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
			assert.throws(() => h.trigger('*[key="other"]', 'onclick'));
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

		it('custom compare used when actual render function passed to expect', () => {
			const h = harness(() => w(WidgetBase, {}), [
				{
					selector: '*',
					property: 'id',
					comparator: (property: any) => typeof property === 'string'
				}
			]);
			h.expect(() => <div id="" />, () => <div id="foo" />);
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
			assert.throws(() => {
				h.trigger('*[key="other"]', 'onclick');
			});
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

	describe('functional widgets', () => {
		it('should inject invalidator mock', () => {
			const factory = create({ icache });

			const App = factory(({ middleware: { icache } }) => {
				const counter = icache.get<number>('counter') || 0;
				return (
					<div>
						<button
							key="click-me"
							onclick={() => {
								const counter = icache.get<number>('counter') || 0;
								icache.set('counter', counter + 1);
							}}
						>{`Click Me ${counter}`}</button>
					</div>
				);
			});
			const h = harness(() => <App />);
			h.expect(() => (
				<div>
					<button key="click-me" onclick={() => {}}>
						Click Me 0
					</button>
				</div>
			));
			h.trigger('@click-me', 'onclick');
			h.expect(() => (
				<div>
					<button key="click-me" onclick={() => {}}>
						Click Me 1
					</button>
				</div>
			));
		});

		it('should run diffProperty middleware', () => {
			const factory = create({ diffProperty, invalidator });
			let id = 0;
			const App = factory(({ middleware: { diffProperty, invalidator } }) => {
				diffProperty('key', () => {
					id++;
					invalidator();
				});
				return (
					<div>
						<button key="click-me">{`Click Me ${id}`}</button>
					</div>
				);
			});
			const h = harness(() => <App />);
			h.expect(() => (
				<div>
					<button key="click-me">Click Me 1</button>
				</div>
			));
			h.expect(() => (
				<div>
					<button key="click-me">Click Me 2</button>
				</div>
			));
			h.expect(() => (
				<div>
					<button key="click-me">Click Me 3</button>
				</div>
			));
		});

		it('should support conditional logic in diffProperty middleware', () => {
			const factory = create({ diffProperty, invalidator });
			let id = 0;
			const App = factory(({ middleware: { diffProperty, invalidator }, properties }) => {
				diffProperty('key', (prev: any, current: any) => {
					if (prev.key === 'app' && current.key === 'app') {
						id++;
						invalidator();
					}
				});
				return (
					<div>
						<button key="click-me">{`${properties().key} ${id}`}</button>
					</div>
				);
			});
			const h = harness(() => <App key="app" />);
			h.expect(() => (
				<div>
					<button key="click-me">app 0</button>
				</div>
			));
			h.expect(() => (
				<div>
					<button key="click-me">app 1</button>
				</div>
			));
		});

		it('should support returning a property value diffProperty middleware', () => {
			const factory = create({ diffProperty, invalidator }).properties<{ foo: string }>();
			let id = 0;
			const App = factory(({ middleware: { diffProperty, invalidator }, properties }) => {
				diffProperty('foo', properties, () => {
					invalidator();
					return `new ${id++}`;
				});
				return (
					<div>
						<button key="click-me">{properties().foo}</button>
					</div>
				);
			});
			const h = harness(() => <App foo="foo" />);
			h.expect(() => (
				<div>
					<button key="click-me">new 0</button>
				</div>
			));
			h.expect(() => (
				<div>
					<button key="click-me">new 1</button>
				</div>
			));
		});
	});
});
