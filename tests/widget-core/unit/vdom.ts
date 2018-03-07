const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { match, spy, stub, SinonStub, SinonSpy } from 'sinon';
import { createResolvers } from './../support/util';
import sendEvent from './../support/sendEvent';

import { dom, InternalVNode, InternalWNode, widgetInstanceMap, RenderResult } from '../../src/vdom';
import { dom as d, v, w, VNODE } from '../../src/d';
import { VNode } from '../../src/interfaces';
import { WidgetBase } from '../../src/WidgetBase';
import { I18nMixin } from '../../src/mixins/I18n';
import { Registry } from '../../src/Registry';

let consoleStub: SinonStub;

const resolvers = createResolvers();

function getWidget(renderResult: RenderResult) {
	return new class extends WidgetBase {
		private _renderResult = renderResult;
		private _nodeHandlerStub = {
			add: stub(),
			addRoot: stub()
		};
		private _onElementCreatedStub = stub();
		private _onElementUpdatedStub = stub();
		private _onAttachStub = stub();
		private _onDetachStub = stub();

		constructor() {
			super();
			const instanceData = widgetInstanceMap.get(this)!;
			const stubs: any = {
				nodeHandler: this._nodeHandlerStub,
				onElementCreated: this._onElementCreatedStub,
				onElementUpdated: this._onElementUpdatedStub,
				onAttach: this._onAttachStub,
				onDetach: this._onDetachStub
			};
			widgetInstanceMap.set(this, { ...instanceData, ...stubs });
		}

		render() {
			if (typeof this._renderResult === 'function') {
				return this._renderResult();
			}
			return this._renderResult;
		}

		public set renderResult(renderResult: RenderResult) {
			this._renderResult = renderResult;
			this.invalidate();
		}

		public get nodeHandlerStub() {
			return this._nodeHandlerStub;
		}

		public get onAttachStub() {
			return this._onAttachStub;
		}

		public get onDetachStub() {
			return this._onDetachStub;
		}
	}();
}

class MainBar extends WidgetBase<any> {
	render() {
		return v('span', { innerHTML: 'Bar' });
	}
}

class MainFoo extends WidgetBase<any> {
	render() {
		const { show } = this.properties;
		return v('div', { classes: ['myClass'], foo: 'bar' }, [
			v('h1', { classes: ['myClass'], key: 'one' }, ['Hello Widget']),
			show ? w(MainBar, { classes: ['myClass'], key: 'first' }) : null,
			show ? w(MainBar, { key: 'second' }) : null,
			show ? null : v('div', { key: 'three' }, ['me']),
			`text node`,
			v('h1', { key: 'two', classes: ['myClass'], innerHTML: 'span' })
		]);
	}
}

class TestWidget extends WidgetBase<any> {
	render() {
		return v('span', { classes: ['myClass'] }, [w(MainFoo, { show: this.properties.show })]);
	}
}

describe('vdom', () => {
	const spys: SinonSpy[] = [];

	beforeEach(() => {
		consoleStub = stub(console, 'warn');
		resolvers.stub();
	});

	afterEach(() => {
		consoleStub.restore();
		resolvers.restore();
		for (let spy of spys) {
			spy.restore();
		}
		spys.length = 0;
	});

	describe('widgets', () => {
		it('should create elements for widgets', () => {
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ show: true });

			const projection = dom.create(widget, { sync: true });
			const span = (projection.domNode.childNodes[0] as Element) as HTMLSpanElement;
			assert.lengthOf(span.childNodes, 1);
			const div = span.childNodes[0] as HTMLDivElement;
			assert.lengthOf(div.childNodes, 5);
			assert.strictEqual(div.getAttribute('foo'), 'bar');

			const headerOne = div.childNodes[0] as HTMLHeadElement;
			const spanOne = div.childNodes[1] as HTMLSpanElement;
			const spanTwo = div.childNodes[2] as HTMLSpanElement;
			const text = div.childNodes[3] as Text;
			const headerTwo = div.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');
		});

		it('should update elements for widget changes', () => {
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget } as any);
			widget.__setProperties__({ show: true });

			const projection = dom.create(widget, { sync: true });
			const root = (projection.domNode.childNodes[0] as Element) as HTMLSpanElement;

			assert.lengthOf(root.childNodes, 1);
			let rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 5);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			let headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			let spanOne = rootChild.childNodes[1] as HTMLSpanElement;
			let spanTwo = rootChild.childNodes[2] as HTMLSpanElement;
			let text = rootChild.childNodes[3] as Text;
			let headerTwo = rootChild.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');

			widget.__setProperties__({ show: false });

			assert.lengthOf(root.childNodes, 1);
			rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 4);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			let insertedDiv = rootChild.childNodes[1] as HTMLDivElement;
			text = rootChild.childNodes[2] as Text;
			headerTwo = rootChild.childNodes[3] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(insertedDiv.childNodes, 1);
			assert.strictEqual((insertedDiv.childNodes[0] as Text).data, 'me');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');

			widget.__setProperties__({ show: true });

			assert.lengthOf(root.childNodes, 1);
			rootChild = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(rootChild.childNodes, 5);
			assert.strictEqual(rootChild.getAttribute('foo'), 'bar');

			headerOne = rootChild.childNodes[0] as HTMLHeadElement;
			spanOne = rootChild.childNodes[1] as HTMLSpanElement;
			spanTwo = rootChild.childNodes[2] as HTMLSpanElement;
			text = rootChild.childNodes[3] as Text;
			headerTwo = rootChild.childNodes[4] as HTMLHeadElement;

			assert.lengthOf(headerOne.childNodes, 1);
			assert.strictEqual((headerOne.childNodes[0] as Text).data, 'Hello Widget');

			assert.lengthOf(spanOne.childNodes, 1);
			assert.strictEqual(spanOne.innerHTML, 'Bar');

			assert.lengthOf(spanTwo.childNodes, 1);
			assert.strictEqual(spanTwo.innerHTML, 'Bar');

			assert.strictEqual(text.data, 'text node');

			assert.lengthOf(headerTwo.childNodes, 1);
			assert.strictEqual(headerTwo.innerHTML, 'span');
		});

		it('invalidates up the widget tree', () => {
			class Foo extends WidgetBase {
				private _id = 0;

				private _onClick() {
					this._id++;
					this.invalidate();
				}

				render() {
					return v('div', { onclick: this._onClick }, [`${this._id}`]);
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [w(Foo, { key: '1' }), w(Foo, { key: '2' })]);
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [w(Bar, {})]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget, { sync: true });

			const root = (projection.domNode.childNodes[0] as Element) as HTMLElement;
			assert.lengthOf(root.childNodes, 1);
			const barDiv = root.childNodes[0];
			assert.lengthOf(barDiv.childNodes, 2);
			const fooOneDiv = barDiv.childNodes[0] as HTMLDivElement;
			const fooTwoDiv = barDiv.childNodes[1] as HTMLDivElement;
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			const fooOneTextNode = fooOneDiv.childNodes[0] as Text;
			const fooTwoTextNode = fooTwoDiv.childNodes[0] as Text;
			assert.strictEqual(fooOneTextNode.data, '0');
			assert.strictEqual(fooTwoTextNode.data, '0');

			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.strictEqual(fooOneDiv.childNodes[0], fooOneTextNode);
			assert.strictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			assert.strictEqual(fooOneTextNode.data, '0');
			assert.strictEqual(fooTwoTextNode.data, '0');
			sendEvent(fooOneDiv, 'click');

			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.notStrictEqual(fooOneDiv.childNodes[0], fooOneTextNode);
			assert.strictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			const updatedFooOneTextNode = fooOneDiv.childNodes[0] as Text;
			assert.strictEqual(updatedFooOneTextNode.data, '1');
			sendEvent(fooTwoDiv, 'click');

			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual(root.childNodes[0], barDiv);
			assert.lengthOf(barDiv.childNodes, 2);
			assert.strictEqual(barDiv.childNodes[0], fooOneDiv);
			assert.strictEqual(barDiv.childNodes[1], fooTwoDiv);
			assert.lengthOf(fooOneDiv.childNodes, 1);
			assert.lengthOf(fooTwoDiv.childNodes, 1);
			assert.strictEqual(fooOneDiv.childNodes[0], updatedFooOneTextNode);
			assert.notStrictEqual(fooTwoDiv.childNodes[0], fooTwoTextNode);
			const updatedFooTwoTextNode = fooTwoDiv.childNodes[0] as Text;
			assert.strictEqual(updatedFooTwoTextNode.data, '1');
			sendEvent(fooOneDiv, 'click');

			assert.strictEqual((fooOneDiv.childNodes[0] as Text).data, '2');
		});

		it('DNodes are bound to the parent widget', () => {
			class Foo extends WidgetBase<any> {
				render() {
					return v('div', { onclick: this.properties.onClick }, this.children);
				}
			}

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', { onclick: this.properties.onClick });
				}
			}
			class App extends WidgetBase {
				public onClickCount = 0;

				_onClick() {
					this.onClickCount++;
				}

				render() {
					return v('div', { onclick: this._onClick }, [
						w(Foo, { onClick: this._onClick }, [
							v('div', { onclick: this._onClick }, [
								w(Bar, {
									onClick: this._onClick
								})
							])
						])
					]);
				}
			}

			const widget = new App();
			const projection: any = dom.create(widget, { sync: true });
			sendEvent(projection.domNode.childNodes[0], 'click', { eventInit: { bubbles: false } });
			sendEvent(projection.domNode.childNodes[0].childNodes[0], 'click', { eventInit: { bubbles: false } });
			sendEvent(projection.domNode.childNodes[0].childNodes[0].childNodes[0], 'click', {
				eventInit: { bubbles: false }
			});
			sendEvent(projection.domNode.childNodes[0].childNodes[0].childNodes[0].childNodes[0], 'click', {
				eventInit: { bubbles: false }
			});
			assert.strictEqual(widget.onClickCount, 4);
		});

		it('supports widget registry items', () => {
			const baseRegistry = new Registry();

			class Foo extends WidgetBase<any> {
				render() {
					return v('h1', [this.properties.text]);
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [this.properties.text]);
				}
			}

			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			class Baz extends WidgetBase {
				render() {
					return v('div', [w<Foo>('foo', { text: 'foo' }), w<Bar>('bar', { text: 'bar' })]);
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection: any = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			const headerOne = root.childNodes[0];
			const headerOneText = headerOne.childNodes[0] as Text;
			const headerTwo = root.childNodes[1];
			const headerTwoText = headerTwo.childNodes[0] as Text;
			assert.strictEqual(headerOneText.data, 'foo');
			assert.strictEqual(headerTwoText.data, 'bar');
		});

		it('registry items', () => {
			let resolver = () => {};
			const baseRegistry = new Registry();
			class Widget extends WidgetBase {
				render() {
					return v('div', ['Hello, world!']);
				}
			}
			class RegistryWidget extends WidgetBase {
				render() {
					return v('div', ['Registry, world!']);
				}
			}
			const promise = new Promise<any>((resolve) => {
				resolver = () => {
					resolve(RegistryWidget);
				};
			});
			baseRegistry.define('registry-item', promise);
			class App extends WidgetBase {
				render() {
					return [w('registry-item', {}), w(Widget, {})];
				}
			}
			const widget = new App();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode as HTMLElement;
			assert.lengthOf(root.childNodes, 1);
			assert.strictEqual((root.childNodes[0].childNodes[0] as Text).data, 'Hello, world!');
			resolver();
			return promise.then(() => {
				assert.lengthOf(root.childNodes, 2);
				assert.strictEqual((root.childNodes[0].childNodes[0] as Text).data, 'Registry, world!');
				assert.strictEqual((root.childNodes[1].childNodes[0] as Text).data, 'Hello, world!');
			});
		});

		it('should invalidate when a registry items is loaded', () => {
			const baseRegistry = new Registry();

			class Foo extends WidgetBase<any> {
				render() {
					return v('h1', [this.properties.text]);
				}
				invalidate() {
					super.invalidate();
				}
			}
			class Bar extends WidgetBase<any> {
				render() {
					return v('h2', [this.properties.text]);
				}
				invalidate() {
					super.invalidate();
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [w<Foo>('foo', { text: 'foo' }), w<Bar>('bar', { text: 'bar' })]);
				}
				invalidate() {
					super.invalidate();
				}
			}

			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 0);
			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);

			const headerOne = root.childNodes[0];
			const headerOneText = headerOne.childNodes[0] as Text;
			const headerTwo = root.childNodes[1];
			const headerTwoText = headerTwo.childNodes[0] as Text;
			assert.strictEqual(headerOneText.data, 'foo');
			assert.strictEqual(headerTwoText.data, 'bar');
		});

		it('supports an array of DNodes', () => {
			class Foo extends WidgetBase {
				private myClass = false;

				render() {
					this.myClass = !this.myClass;
					const classes = this.myClass ? ['myClass'] : [];

					return [
						v('div', { classes }, ['1']),
						v('div', {}, ['2']),
						v('div', { classes: ['myClass'] }, ['3'])
					];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', [w(Foo, {})]);
				}
			}

			const widget = new Bar();
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 3);
			const childOne = root.childNodes[0];
			assert.lengthOf(childOne.childNodes, 1);
			const textNodeOne = childOne.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, '1');
			const childTwo = root.childNodes[1];
			assert.lengthOf(childTwo.childNodes, 1);
			const textNodeTwo = childTwo.childNodes[0] as Text;
			assert.strictEqual(textNodeTwo.data, '2');
			const childThree = root.childNodes[2];
			assert.lengthOf(childThree.childNodes, 1);
			const textNodeThree = childThree.childNodes[0] as Text;
			assert.strictEqual(textNodeThree.data, '3');

			widget.invalidate();
			const secondRenderResult = widget.__render__() as VNode;
			const firstWNode = secondRenderResult.children![0] as InternalWNode;
			const secondWNode = secondRenderResult.children![0] as InternalWNode;
			assert.strictEqual(firstWNode.rendered, secondWNode.rendered);
		});

		it('supports null and undefined return from render', () => {
			class Foo extends WidgetBase {
				render() {
					return null;
				}
			}

			class Bar extends WidgetBase {
				render() {
					return undefined;
				}
			}

			class Baz extends WidgetBase {
				render() {
					return v('div', [w(Foo, {}), w(Bar, {})]);
				}
			}

			const widget = new Baz();
			const projection: any = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 0);
		});

		it('supports null return from render and subsequent return on re-render', () => {
			let fooInvalidate: any;
			class Foo extends WidgetBase<any> {
				private myClass = false;

				constructor() {
					super();
					fooInvalidate = this.invalidate.bind(this);
				}

				render() {
					if (!this.properties.show) {
						return null;
					}
					this.myClass = !this.myClass;
					const classes = this.myClass ? ['myClass'] : [];
					return v('div', { key: '1', classes }, ['content']);
				}
			}

			class Baz extends WidgetBase {
				private _show = false;

				set show(value: boolean) {
					this._show = value;
					this.invalidate();
				}

				render() {
					return v('div', [w(Foo, { show: this._show })]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 0);
			widget.show = true;

			assert.lengthOf(root.childNodes, 1);
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.lengthOf(fooDiv.classList, 1);
			assert.lengthOf(fooDiv.childNodes, 1);
			const fooDivContent = fooDiv.childNodes[0] as Text;
			assert.strictEqual(fooDivContent.data, 'content');
			fooInvalidate();

			assert.lengthOf(fooDiv.classList, 0);
			assert.lengthOf(fooDiv.childNodes, 1);
		});

		it('Should insert nodes at correct position the previous widget returned null', () => {
			class Foo extends WidgetBase {
				render() {
					return v('div', ['foo']);
				}
			}

			class Bar extends WidgetBase {
				render() {
					return v('div', ['bar']);
				}
			}

			class Baz extends WidgetBase<any> {
				render() {
					const { widget = 'default' } = this.properties;
					return v('div', [
						v('div', ['first']),
						w(widget, {}),
						w(widget, {}),
						v('div', ['second']),
						w(widget, {})
					]);
				}
			}

			const baseRegistry = new Registry();
			baseRegistry.define('foo', Foo);
			baseRegistry.define('bar', Bar);
			const widget = new Baz();
			widget.__setCoreProperties__({ bind: widget, baseRegistry });
			const projection = dom.create(widget, { sync: true });
			const root: any = projection.domNode.childNodes[0];
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'other' });
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'foo' });
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'foo');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'foo');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'foo');
			widget.__setProperties__({ widget: 'bar' });
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'bar');
			widget.__setProperties__({ widget: 'other' });
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'second');
			widget.__setProperties__({ widget: 'bar' });
			assert.strictEqual(root.childNodes[0].childNodes[0].data, 'first');
			assert.strictEqual(root.childNodes[1].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[2].childNodes[0].data, 'bar');
			assert.strictEqual(root.childNodes[3].childNodes[0].data, 'second');
			assert.strictEqual(root.childNodes[4].childNodes[0].data, 'bar');
		});

		it('should allow a widget returned from render', () => {
			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [`Hello, ${this.properties.foo}!`]);
				}
			}

			class Baz extends WidgetBase<any> {
				render() {
					return w(Bar, { foo: this.properties.foo });
				}
			}

			const widget = new Baz();
			widget.__setProperties__({ foo: 'foo' });
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(root.childNodes, 1);
			let textNodeOne = root.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, 'Hello, foo!');
			widget.__setProperties__({ foo: 'bar' });

			textNodeOne = root.childNodes[0] as Text;
			assert.strictEqual(textNodeOne.data, 'Hello, bar!');
		});

		it('should create nodes for an array returned from the top level via a widget', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			const widget = new Bar();
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('should update an array of nodes to single node', () => {
			class Foo extends WidgetBase {
				private _array = false;
				render() {
					this._array = !this._array;
					return this._array
						? [v('div', { key: '1' }, ['1']), v('div', { key: '2' }, ['2']), v('div', { key: '3' }, ['3'])]
						: v('div', { key: '1' }, ['2']);
				}
			}

			const widget = new Foo();
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
			widget.invalidate();

			assert.lengthOf(root.childNodes, 1);
			const textNodeChild = root.childNodes[0].childNodes[0] as Text;
			assert.strictEqual(textNodeChild.data, '2');
		});

		it('should only render a sub tree from an invalidation', () => {
			let parentRenderCount = 0;
			let barRenderCount = 0;
			let bazRenderCount = 0;
			let barClicker: () => void = () => {};
			let bazClicker: () => void = () => {};

			class Bar extends WidgetBase {
				private _counter = 0;

				private _onClick = () => {
					this._counter++;
					this.invalidate();
				};

				constructor() {
					super();
					barClicker = this._onClick;
				}

				protected render() {
					barRenderCount++;
					return v('div', [`bar ${this._counter}`]);
				}
			}

			class Baz extends WidgetBase {
				private _counter = 0;

				private _onClick = () => {
					this._counter++;
					this.invalidate();
				};

				constructor() {
					super();
					bazClicker = this._onClick;
				}

				protected render() {
					bazRenderCount++;
					return v('div', [`baz ${this._counter}`]);
				}
			}

			class Foo extends WidgetBase {
				protected render() {
					parentRenderCount++;
					return v('div', [w(Bar, {}), w(Baz, {})]);
				}
			}

			const widget = new Foo();
			dom.create(widget);
			assert.strictEqual(parentRenderCount, 1);
			assert.strictEqual(barRenderCount, 1);
			assert.strictEqual(bazRenderCount, 1);
			bazClicker();
			resolvers.resolve();
			assert.strictEqual(parentRenderCount, 1);
			assert.strictEqual(barRenderCount, 1);
			assert.strictEqual(bazRenderCount, 2);
			barClicker();
			resolvers.resolve();
			assert.strictEqual(parentRenderCount, 1);
			assert.strictEqual(barRenderCount, 2);
			assert.strictEqual(bazRenderCount, 2);
		});

		it('should append nodes for an array returned from the top level', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			const div = document.createElement('div');
			const widget = new Foo();
			const projection = dom.append(div, widget);
			const root = projection.domNode as Element;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('should append nodes for an array returned from the top level via a widget', () => {
			class Foo extends WidgetBase {
				render() {
					return [v('div', ['1']), v('div', ['2']), v('div', ['3'])];
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			const div = document.createElement('div');
			const widget = new Bar();
			const projection = dom.append(div, widget);
			const root = projection.domNode;
			assert.lengthOf(root.childNodes, 3);
			const firstTextNodeChild = root.childNodes[0].childNodes[0] as Text;
			const secondTextNodeChild = root.childNodes[1].childNodes[0] as Text;
			const thirdTextNodeChild = root.childNodes[2].childNodes[0] as Text;
			assert.strictEqual(firstTextNodeChild.data, '1');
			assert.strictEqual(secondTextNodeChild.data, '2');
			assert.strictEqual(thirdTextNodeChild.data, '3');
		});

		it('Do not break early for the same WNode', () => {
			class Foo extends WidgetBase<any> {
				render() {
					const children = this.children.map((child: any, index: number) => {
						child.properties.selected = this.properties.selected === index;
						return child;
					});

					return v('div', children);
				}
			}

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.selected ? 'selected' : 'not selected']);
				}
			}

			const widget = new Foo();
			widget.__setChildren__([w(Bar, { key: '1' }), w(Bar, { key: '2' })]);
			widget.__setProperties__({ selected: 0 });
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0];
			assert.lengthOf(root.childNodes, 2);
			let firstTextNode = root.childNodes[0].childNodes[0] as Text;
			let secondTextNode = root.childNodes[1].childNodes[0] as Text;
			assert.strictEqual(firstTextNode.data, 'selected');
			assert.strictEqual(secondTextNode.data, 'not selected');
			widget.__setProperties__({ selected: 1 });

			firstTextNode = root.childNodes[0].childNodes[0] as Text;
			secondTextNode = root.childNodes[1].childNodes[0] as Text;
			assert.strictEqual(firstTextNode.data, 'not selected');
			assert.strictEqual(secondTextNode.data, 'selected');
		});

		it('removes existing widget and uses new widget when widget changes', () => {
			let fooCreated = false;
			let barCreatedCount = 0;
			class Foo extends WidgetBase {
				constructor() {
					super();
					fooCreated = true;
				}

				render() {
					return v('div');
				}
			}

			class Bar extends WidgetBase {
				constructor() {
					super();
					barCreatedCount++;
				}

				render() {
					return v('span');
				}
			}

			class Baz extends WidgetBase {
				private _foo = true;

				set foo(value: boolean) {
					this._foo = value;
					this.invalidate();
				}

				render() {
					return v('div', [
						this._foo ? w(Foo, {}) : w(Bar, {}),
						this._foo ? w(Bar, { key: '1' }) : w(Bar, { key: '2' })
					]);
				}
			}

			const widget = new Baz();
			dom.create(widget);
			resolvers.resolve();
			assert.isTrue(fooCreated);
			widget.foo = false;
			widget.invalidate();
			resolvers.resolve();
			assert.strictEqual(barCreatedCount, 3);
		});

		it('calls onAttach when widget is rendered', () => {
			let onAttachCallCount = 0;
			class Foo extends WidgetBase {
				onAttach() {
					onAttachCallCount++;
				}
			}
			const widget = new Foo();
			dom.create(widget);
			resolvers.resolve();
			assert.strictEqual(onAttachCallCount, 1);
			widget.invalidate();
			resolvers.resolve();
			assert.strictEqual(onAttachCallCount, 1);
		});

		it('calls onDetach when widget is removed', () => {
			let fooAttachCount = 0;
			let fooDetachCount = 0;
			let barAttachCount = 0;
			let barDetachCount = 0;
			let bazAttachCount = 0;
			let bazDetachCount = 0;
			let quxAttachCount = 0;
			let quxDetachCount = 0;

			class Qux extends WidgetBase {
				onAttach() {
					quxAttachCount++;
				}

				onDetach() {
					quxDetachCount++;
				}
			}

			class Foo extends WidgetBase {
				onAttach() {
					fooAttachCount++;
				}

				onDetach() {
					fooDetachCount++;
				}

				render() {
					return [w(Qux, {}), v('div', [w(Qux, {})])];
				}
			}

			class Bar extends WidgetBase {
				onAttach() {
					barAttachCount++;
				}

				onDetach() {
					barDetachCount++;
				}
			}

			class FooBar extends WidgetBase {}

			class Baz extends WidgetBase {
				private _foo = false;

				onAttach() {
					bazAttachCount++;
				}

				onDetach() {
					bazDetachCount++;
				}

				render() {
					this._foo = !this._foo;
					return v('div', [
						w(FooBar, {}),
						this._foo ? w(Foo, {}) : null,
						w(FooBar, {}),
						this._foo ? w(Foo, {}) : w(Bar, {})
					]);
				}
			}
			const widget = new Baz();
			dom.create(widget);
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 2);
			assert.strictEqual(fooDetachCount, 0);
			assert.strictEqual(barAttachCount, 0);
			assert.strictEqual(barDetachCount, 0);
			assert.strictEqual(quxAttachCount, 4);
			assert.strictEqual(quxDetachCount, 0);
			widget.invalidate();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 2);
			assert.strictEqual(fooDetachCount, 2);
			assert.strictEqual(barAttachCount, 1);
			assert.strictEqual(barDetachCount, 0);
			assert.strictEqual(quxAttachCount, 4);
			assert.strictEqual(quxDetachCount, 4);
			widget.invalidate();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 4);
			assert.strictEqual(fooDetachCount, 2);
			assert.strictEqual(barAttachCount, 1);
			assert.strictEqual(barDetachCount, 1);
			assert.strictEqual(quxAttachCount, 8);
			assert.strictEqual(quxDetachCount, 4);
			widget.invalidate();
			resolvers.resolve();
			assert.strictEqual(bazAttachCount, 1);
			assert.strictEqual(bazDetachCount, 0);
			assert.strictEqual(fooAttachCount, 4);
			assert.strictEqual(fooDetachCount, 4);
			assert.strictEqual(barAttachCount, 2);
			assert.strictEqual(barDetachCount, 1);
			assert.strictEqual(quxAttachCount, 8);
			assert.strictEqual(quxDetachCount, 8);
		});

		it('should not throw error running `onDetach` for widgets that do not have any rendered children', () => {
			class Foo extends WidgetBase {
				render() {
					return null;
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			class Baz extends WidgetBase {
				private _show = false;

				render() {
					this._show = !this._show;
					return this._show ? w(Bar, {}) : null;
				}
			}

			const widget = new Baz();
			dom.create(widget);
			resolvers.resolve();
			widget.invalidate();
			assert.doesNotThrow(() => {
				resolvers.resolve();
			});
		});

		it('remove elements for embedded WNodes', () => {
			class Foo extends WidgetBase {
				render() {
					return v('div', { id: 'foo' });
				}
			}

			class Bar extends WidgetBase {
				render() {
					return w(Foo, {});
				}
			}

			class Baz extends WidgetBase {
				private _show = true;

				set show(value: boolean) {
					this._show = value;
					this.invalidate();
				}

				render() {
					return v('div', [this._show ? w(Bar, {}) : null]);
				}
			}

			const widget = new Baz();
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			const fooDiv = root.childNodes[0] as HTMLDivElement;
			assert.strictEqual(fooDiv.getAttribute('id'), 'foo');
			widget.show = false;

			assert.isNull(fooDiv.parentNode);
		});

		it('should warn in the console for siblings for the same widgets with no key when added or removed', () => {
			class Foo extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.text]);
				}
			}

			class Baz extends WidgetBase {
				show = false;

				render() {
					return v('div', [
						w(Foo, { text: '1' }),
						this.show ? w(Foo, { text: '2' }) : null,
						w(Foo, { text: '3' }),
						v('div', [w(Foo, { text: '4' })])
					]);
				}
			}

			const widgetName = (Foo as any).name || 'unknown';
			const parentName = (Baz as any).name || 'unknown';

			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			const widget = new Baz();
			dom.create(widget);
			assert.isTrue(consoleStub.notCalled);
			widget.show = true;
			widget.invalidate();
			resolvers.resolve();
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		it('Should support widgets using deferred properties', () => {
			let deferredPropertyCallCount = 0;

			class Bar extends WidgetBase<any> {
				render() {
					return v(
						'div',
						() => {
							deferredPropertyCallCount++;
							return {
								id: 'bar-root',
								key: 'bar-root'
							};
						},
						[
							v('div', () => {
								deferredPropertyCallCount++;
								return {
									id: 'bar-container',
									key: 'bar-container',
									innerHTML: 'bar-container'
								};
							})
						]
					);
				}
			}

			class Foo extends WidgetBase<any> {
				render() {
					return v(
						'div',
						() => {
							deferredPropertyCallCount++;
							return {
								id: 'foo-root',
								key: 'root'
							};
						},
						[
							v('div', () => {
								deferredPropertyCallCount++;
								return {
									key: 'foo-container',
									id: 'container',
									innerHTML: 'foo-container'
								};
							}),
							w(Bar, { key: 'bar' })
						]
					);
				}
			}

			const widget = new Foo();
			const projection = dom.create(widget, { sync: true });
			assert.strictEqual(deferredPropertyCallCount, 8);
			const root: any = projection.domNode.childNodes[0];
			assert.lengthOf(root.childNodes, 2);
			const fooContainer = root.childNodes[0];
			assert.lengthOf(fooContainer.childNodes, 1);
			const fooLabel = fooContainer.childNodes[0] as Text;
			assert.strictEqual(fooLabel.data, 'foo-container');
			const barRoot = root.childNodes[1];
			assert.lengthOf(barRoot.childNodes, 1);
			const barContainer = barRoot.childNodes[0];
			assert.lengthOf(barContainer.childNodes, 1);
			const barLabel = barContainer.childNodes[0] as Text;
			assert.strictEqual(barLabel.data, 'bar-container');
			widget.invalidate();
			assert.strictEqual(deferredPropertyCallCount, 12);
		});

		describe('supports merging with a widget returned a the top level', () => {
			it('Supports merging DNodes onto existing HTML', () => {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				iframe.contentDocument.write(
					`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button></div>`
				);
				iframe.contentDocument.close();
				const root = iframe.contentDocument.body.firstChild as HTMLElement;
				const childElementCount = root.childElementCount;
				const select = root.childNodes[1] as HTMLSelectElement;
				const button = root.childNodes[2] as HTMLButtonElement;
				assert.strictEqual(select.value, 'bar', 'bar should be selected');
				const onclickListener = spy();
				class Foo extends WidgetBase {
					render() {
						return v(
							'div',
							{
								classes: ['foo', 'bar']
							},
							[
								v(
									'label',
									{
										for: 'baz'
									},
									['Select Me:']
								),
								v(
									'select',
									{
										type: 'text',
										name: 'baz',
										id: 'baz',
										disabled: false
									},
									[
										v('option', { value: 'foo', selected: true }, ['label foo']),
										v('option', { value: 'bar', selected: false }, ['label bar']),
										v('option', { value: 'baz', selected: false }, ['label baz'])
									]
								),
								v(
									'button',
									{
										type: 'button',
										disabled: false,
										onclick: onclickListener
									},
									['Click Me!']
								)
							]
						);
					}
				}

				class Bar extends WidgetBase {
					render() {
						return w(Foo, {});
					}
				}
				const widget = new Bar();
				dom.merge(root, widget, { sync: true });
				assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
				assert.strictEqual(
					root.childElementCount,
					childElementCount,
					'should have the same number of children'
				);
				assert.strictEqual(select, root.childNodes[1], 'should have been reused');
				assert.strictEqual(button, root.childNodes[2], 'should have been reused');
				assert.isFalse(select.disabled, 'select should be enabled');
				assert.isFalse(button.disabled, 'button should be enabled');

				assert.strictEqual(select.value, 'foo', 'foo should be selected');
				assert.strictEqual(select.children.length, 3, 'should have 3 children');

				assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

				const clickEvent = document.createEvent('CustomEvent');
				clickEvent.initEvent('click', true, true);
				button.dispatchEvent(clickEvent);
				assert.isTrue(onclickListener.called, 'onclickListener should have been called');

				document.body.removeChild(iframe);
			});

			it('Supports merging DNodes with widgets onto existing HTML', () => {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				iframe.contentDocument.write(
					`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button><span>label</span><div>last node</div></div>`
				);
				iframe.contentDocument.close();
				const root = iframe.contentDocument.body.firstChild as HTMLElement;
				const childElementCount = root.childElementCount;
				const label = root.childNodes[0] as HTMLLabelElement;
				const select = root.childNodes[1] as HTMLSelectElement;
				const button = root.childNodes[2] as HTMLButtonElement;
				const span = root.childNodes[3] as HTMLElement;
				const div = root.childNodes[4] as HTMLElement;
				assert.strictEqual(select.value, 'bar', 'bar should be selected');
				const onclickListener = spy();

				class Button extends WidgetBase {
					render() {
						return [
							v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
							v('span', {}, ['label'])
						];
					}
				}
				class Foo extends WidgetBase {
					render() {
						return v(
							'div',
							{
								classes: ['foo', 'bar']
							},
							[
								v(
									'label',
									{
										for: 'baz'
									},
									['Select Me:']
								),
								v(
									'select',
									{
										type: 'text',
										name: 'baz',
										id: 'baz',
										disabled: false
									},
									[
										v('option', { value: 'foo', selected: true }, ['label foo']),
										v('option', { value: 'bar', selected: false }, ['label bar']),
										v('option', { value: 'baz', selected: false }, ['label baz'])
									]
								),
								w(Button, {}),
								v('div', ['last node'])
							]
						);
					}
				}
				class Bar extends WidgetBase {
					render() {
						return w(Foo, {});
					}
				}
				const widget = new Bar();
				dom.merge(root, widget, { sync: true });
				assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
				assert.strictEqual(
					root.childElementCount,
					childElementCount,
					'should have the same number of children'
				);
				assert.strictEqual(label, root.childNodes[0], 'should have been reused');
				assert.strictEqual(select, root.childNodes[1], 'should have been reused');
				assert.strictEqual(button, root.childNodes[2], 'should have been reused');
				assert.strictEqual(span, root.childNodes[3], 'should have been reused');
				assert.strictEqual(div, root.childNodes[4], 'should have been reused');
				assert.isFalse(select.disabled, 'select should be enabled');
				assert.isFalse(button.disabled, 'button should be enabled');

				assert.strictEqual(select.value, 'foo', 'foo should be selected');
				assert.strictEqual(select.children.length, 3, 'should have 3 children');

				assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

				const clickEvent = document.createEvent('CustomEvent');
				clickEvent.initEvent('click', true, true);
				button.dispatchEvent(clickEvent);
				assert.isTrue(onclickListener.called, 'onclickListener should have been called');

				document.body.removeChild(iframe);
			});

			it('Skips unknown nodes when merging', () => {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				iframe.contentDocument.write(`
					<div class="foo">
						<label for="baz">Select Me:</label>
						<select type="text" name="baz" id="baz" disabled="disabled">
							<option value="foo">label foo</option>
							<option value="bar" selected="">label bar</option>
							<option value="baz">label baz</option>
						</select>
						<button type="button" disabled="disabled">Click Me!</button>
						<span>label</span>
						<div>last node</div>
					</div>`);
				iframe.contentDocument.close();
				const root = iframe.contentDocument.body.firstChild as HTMLElement;
				const childElementCount = root.childElementCount;
				const label = root.childNodes[1] as HTMLLabelElement;
				const select = root.childNodes[3] as HTMLSelectElement;
				const button = root.childNodes[5] as HTMLButtonElement;
				const span = root.childNodes[7] as HTMLElement;
				const div = root.childNodes[9] as HTMLElement;
				assert.strictEqual(select.value, 'bar', 'bar should be selected');
				const onclickListener = spy();

				class Button extends WidgetBase {
					render() {
						return [
							v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
							v('span', {}, ['label'])
						];
					}
				}
				class Foo extends WidgetBase {
					render() {
						return v(
							'div',
							{
								classes: ['foo', 'bar']
							},
							[
								v(
									'label',
									{
										for: 'baz'
									},
									['Select Me:']
								),
								v(
									'select',
									{
										type: 'text',
										name: 'baz',
										id: 'baz',
										disabled: false
									},
									[
										v('option', { value: 'foo', selected: true }, ['label foo']),
										v('option', { value: 'bar', selected: false }, ['label bar']),
										v('option', { value: 'baz', selected: false }, ['label baz'])
									]
								),
								w(Button, {}),
								v('div', ['last node'])
							]
						);
					}
				}
				class Bar extends WidgetBase {
					render() {
						return w(Foo, {});
					}
				}
				const widget = new Bar();
				dom.merge(root, widget, { sync: true });
				assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
				assert.strictEqual(
					root.childElementCount,
					childElementCount,
					'should have the same number of children'
				);
				assert.strictEqual(label, root.childNodes[1], 'should have been reused');
				assert.strictEqual(select, root.childNodes[3], 'should have been reused');
				assert.strictEqual(button, root.childNodes[5], 'should have been reused');
				assert.strictEqual(span, root.childNodes[7], 'should have been reused');
				assert.strictEqual(div, root.childNodes[9], 'should have been reused');
				assert.isFalse(select.disabled, 'select should be enabled');
				assert.isFalse(button.disabled, 'button should be enabled');

				assert.strictEqual(select.value, 'foo', 'foo should be selected');
				assert.strictEqual(select.children.length, 3, 'should have 3 children');

				assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

				const clickEvent = document.createEvent('CustomEvent');
				clickEvent.initEvent('click', true, true);
				button.dispatchEvent(clickEvent);
				assert.isTrue(onclickListener.called, 'onclickListener should have been called');

				document.body.removeChild(iframe);
			});

			it('Should only merge on the first render', () => {
				const iframe = document.createElement('iframe');
				document.body.appendChild(iframe);
				iframe.contentDocument.write(`<div>Loading</div>`);
				iframe.contentDocument.close();
				const root = iframe.contentDocument.body.firstChild as HTMLElement;

				class Bar extends WidgetBase<any> {
					render() {
						return v('div', [`Item ${this.properties.id}`]);
					}
				}

				class Foo extends WidgetBase {
					private _renderCount = 0;

					render() {
						let nodes;
						if (this._renderCount === 0) {
							nodes = v('div', ['Loading']);
						} else {
							nodes = v('div', [w(Bar, { id: '1' }), w(Bar, { id: '2' }), w(Bar, { id: '3' })]);
						}
						this._renderCount++;
						return nodes;
					}
				}
				const widget = new Foo();
				dom.merge(root, widget, { sync: true });
				assert.lengthOf(root.childNodes, 1);
				widget.invalidate();
				assert.strictEqual(root.childNodes.length, 3);
				assert.strictEqual((root.childNodes[0].childNodes[0] as Text).data, 'Item 1');
				assert.strictEqual((root.childNodes[1].childNodes[0] as Text).data, 'Item 2');
				assert.strictEqual((root.childNodes[2].childNodes[0] as Text).data, 'Item 3');
				document.body.removeChild(iframe);
			});
		});
	});

	describe('create', () => {
		it('should create and update single text nodes', () => {
			const widget = getWidget(v('div', ['text']));
			const projection = dom.create(widget, { sync: true });
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');

			widget.renderResult = v('div', ['text2']);

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');

			widget.renderResult = v('div', ['text2', v('span', ['a'])]);

			assert.strictEqual(
				(projection.domNode.childNodes[0] as Element).outerHTML,
				'<div>text2<span>a</span></div>'
			);

			widget.renderResult = v('div', ['text2']);

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');

			widget.renderResult = v('div', ['text']);

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
		});

		it('should work correctly with adjacent text nodes', () => {
			const widget = getWidget(v('div', ['', '1', '']));
			const projection = dom.create(widget, { sync: true });
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>1</div>');

			widget.renderResult = v('div', [' ', '']);

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div> </div>');

			widget.renderResult = v('div', ['', '1', '']);

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>1</div>');
		});

		it('should break update when vdom object references are equal', () => {
			const vNode = v('div', ['text']);
			const widget = getWidget(vNode);
			const projection = dom.create(widget, { sync: true });
			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
			vNode.text = 'new';
			widget.renderResult = vNode;

			assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text</div>');
		});

		it('should allow changing the root selector', () => {
			const widget = getWidget(v('div'));
			const projection = dom.create(widget, { sync: true });
			assert.strictEqual(projection.domNode.children[0].tagName, 'DIV');
			widget.renderResult = v('span');

			assert.strictEqual(projection.domNode.children[0].tagName, 'SPAN');
		});

		it('should allow an existing dom node to be used', () => {
			const node = document.createElement('div');
			(node as any).foo = 'foo';
			const childNode = document.createElement('span');
			(childNode as any).bar = 'bar';
			node.appendChild(childNode);
			const appendChildSpy = spy(node, 'appendChild');

			const childVNode = v('span', { id: 'b' }) as InternalVNode;
			childVNode.domNode = childNode;
			const vNode = v('div', { id: 'a' }, [childVNode]) as InternalVNode;
			vNode.domNode = node;

			const widget = getWidget(vNode);
			const projection = dom.create(widget, { sync: true });
			const root = (projection.domNode.childNodes[0] as Element) as any;
			assert.strictEqual(root.outerHTML, '<div id="a"><span id="b"></span></div>');
			assert.strictEqual(root.foo, 'foo');
			assert.strictEqual(root.children[0].bar, 'bar');
			assert.isFalse(appendChildSpy.called);
		});

		it('will append nodes with attributes already attached', (test) => {
			const expected = '<div data-attr="test"></div>';
			const appendedHtml: string[] = [];

			const createElement = document.createElement.bind(document);
			const createElementStub = stub(document, 'createElement').callsFake((name: string) => {
				const node = createElement(name);
				const appendChild = node.appendChild.bind(node);
				stub(node, 'appendChild').callsFake((node: Element) => {
					appendedHtml.push(node.outerHTML);
					return appendChild(node);
				});
				return node;
			});
			spys.push(createElementStub);
			const widget = getWidget(v('div', { 'data-attr': 'test' }));
			const projection = dom.create(widget, { sync: true });

			assert.strictEqual(projection.domNode.innerHTML, expected);
			assert.lengthOf(appendedHtml, 1);
			assert.strictEqual(appendedHtml[0], expected);
		});
	});

	describe('properties', () => {
		it('does not add "key" to the dom node', () => {
			const widget = getWidget(v('div', { key: '1' }));
			const projection = dom.create(widget, { sync: true });
			const div = projection.domNode.childNodes[0] as HTMLElement;
			assert.isNull(div.getAttribute('key'));
		});

		it('sets properties even when the default DOM node value matches', () => {
			const widget = getWidget(v('div', { tabIndex: -1 }));
			const projection = dom.create(widget, { sync: true });
			const div = projection.domNode.childNodes[0] as HTMLElement;
			assert.strictEqual(div.getAttribute('tabindex'), '-1');
		});

		it('updates attributes', () => {
			const widget = getWidget(v('a', { href: '#1' }));
			const projection = dom.create(widget, { sync: true });
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.strictEqual(link.getAttribute('href'), '#1');

			widget.renderResult = v('a', { href: '#2' });

			assert.strictEqual(link.getAttribute('href'), '#2');

			widget.renderResult = v('a', { href: undefined });

			assert.strictEqual(link.getAttribute('href'), '');
		});

		it('can add an attribute that was initially undefined', () => {
			const widget = getWidget(v('a', { href: undefined }));
			const projection = dom.create(widget, { sync: true });
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.isNull(link.getAttribute('href'));

			widget.renderResult = v('a', { href: '#2' });

			assert.strictEqual(link.getAttribute('href'), '#2');
		});

		it('can remove disabled property when set to null or undefined', () => {
			const widget = getWidget(v('a', { disabled: true }));
			const projection = dom.create(widget, { sync: true });
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;

			assert.isTrue(link.disabled);
			// Unfortunately JSDom does not map the property value to the attribute as real browsers do
			// expect(link.getAttribute('disabled')).to.equal('');

			widget.renderResult = v('a', { disabled: null as any });

			// What Chrome would do:
			// expect(link.disabled).to.equal(false);
			// expect(link.getAttribute('disabled')).to.be.null;

			// What JSDom does:
			assert.isFalse(!!link.disabled);
		});

		it('updates properties', () => {
			const widget = getWidget(v('a', { href: '#1', tabIndex: 1 }));
			const projection = dom.create(widget, { sync: true });
			const link = (projection.domNode.childNodes[0] as Element) as HTMLLinkElement;
			assert.strictEqual(link.tabIndex, 1);

			widget.renderResult = v('a', { href: '#1', tabIndex: 2 });

			assert.strictEqual(link.tabIndex, 2);

			widget.renderResult = v('a', { href: '#1', tabIndex: undefined });

			assert.strictEqual(link.tabIndex, 0);
		});

		it('updates innerHTML', () => {
			const widget = getWidget(v('p', { innerHTML: '<span>INNER</span>' }));
			const projection = dom.create(widget, { sync: true });
			const paragraph = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'INNER');

			widget.renderResult = v('p', { innerHTML: '<span>UPDATED</span>' });

			assert.lengthOf(paragraph.childNodes, 1);
			assert.strictEqual(paragraph.childNodes[0].textContent, 'UPDATED');
		});

		it('does not mess up scrolling in Edge', () => {
			const widget = getWidget(v('div', { scrollTop: 0 }));
			const projection = dom.create(widget, { sync: true });
			const div = (projection.domNode.childNodes[0] as Element) as HTMLDivElement;
			Object.defineProperty(div, 'scrollTop', {
				get: () => 1,
				set: stub().throws('Setting scrollTop would mess up scrolling')
			}); // meaning: div.scrollTop = 1;
			widget.renderResult = v('div', { scrollTop: 1 });
		});

		describe('classes', () => {
			it('adds and removes classes', () => {
				const widget = getWidget(v('div', { classes: ['a'] }));
				const projection = dom.create(widget, { sync: true });
				const div = (projection.domNode.childNodes[0] as Element) as HTMLDivElement;
				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div', { classes: ['a', 'b'] });
				assert.strictEqual(div.className, 'a b');
				widget.renderResult = v('div', { classes: ['b'] });
				assert.strictEqual(div.className, 'b');
			});

			it('should leave classes that are not controlled', () => {
				const div = document.createElement('div');
				div.className = 'c b';
				const widget = getWidget(v('div', { classes: ['a'] }));
				dom.merge(div, widget, { sync: true });
				assert.strictEqual(div.className, 'c b a');
				widget.renderResult = v('div', { classes: ['a', 'b'] });
				assert.strictEqual(div.className, 'c b a');
				widget.renderResult = v('div', { classes: ['b'] });
				assert.strictEqual(div.className, 'c b');
				widget.renderResult = v('div');
				assert.strictEqual(div.className, 'c');
			});

			it('supports null, undefined and zero length strings in classes', () => {
				const div = document.createElement('div');
				div.className = 'b';
				const widget = getWidget(v('div', { classes: ['b', null, null, null] }));
				dom.merge(div, widget, { sync: true });
				assert.strictEqual(div.className, 'b');
				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });

				assert.strictEqual(div.className, 'a');

				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });

				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div', { classes: [] });

				assert.strictEqual(div.className, '');
				widget.renderResult = v('div', { classes: ['a', null, undefined, ''] });

				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div');

				assert.strictEqual(div.className, '');
			});

			it('classes accepts a string', () => {
				const widget = getWidget(v('div', { classes: 'b' }));
				const div = document.createElement('div');
				dom.merge(div, widget, { sync: true });
				assert.strictEqual(div.className, 'b');
				widget.renderResult = v('div', { classes: 'b' });

				assert.strictEqual(div.className, 'b');

				widget.renderResult = v('div', { classes: 'a' });

				assert.strictEqual(div.className, 'a');
				widget.renderResult = v('div');

				assert.strictEqual(div.className, '');
				widget.renderResult = v('div', { classes: null });

				assert.strictEqual(div.className, '');
				widget.renderResult = v('div');

				widget.renderResult = v('div', { classes: 'a b' });

				assert.strictEqual(div.className, 'a b');
			});

			it('should split class names by space before applying/removing', () => {
				const widget = getWidget(v('div', { classes: 'a b' }));
				const div = document.createElement('div');
				dom.merge(div, widget, { sync: true });
				assert.strictEqual(div.className, 'a b');
				widget.renderResult = v('div');

				assert.strictEqual(div.className, '');

				widget.renderResult = v('div', { classes: ['a b'] });

				assert.strictEqual(div.className, 'a b');
				widget.renderResult = v('div');

				assert.strictEqual(div.className, '');
			});

			it('should accept null as a class', () => {
				const widget = getWidget(v('div', { classes: null }));
				const div = document.createElement('div');
				dom.merge(div, widget, { sync: true });
				assert.strictEqual(div.className, '');
			});

			it('can add and remove multiple classes in IE11', () => {
				const widget = getWidget(v('div', { classes: 'a b c d' }));
				const projection = dom.create(widget, { sync: true });
				const root = projection.domNode.childNodes[0] as HTMLElement;
				assert.strictEqual(root.className, 'a b c d');
				widget.renderResult = v('div', { classes: 'a b' });
			});
		});

		describe('styles', () => {
			it('should not allow non-string values', () => {
				const widget = getWidget(v('div', { styles: { height: 20 as any } }));
				try {
					dom.create(widget, { sync: true });
					assert.fail();
				} catch (e) {
					assert.isTrue(e.message.indexOf('strings') >= 0);
				}
			});

			it('should add styles to the real DOM', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const projection = dom.create(widget, { sync: true });
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 20px;"></div>'
				);
			});

			it('should update styles', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', { styles: { height: '30px' } });

				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 30px;"></div>'
				);
			});

			it('should remove styles', () => {
				const widget = getWidget(v('div', { styles: { width: '30px', height: '20px' } }));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', { styles: { height: null, width: '30px' } });

				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="width: 30px;"></div>'
				);
			});

			it('should add styles', () => {
				const widget = getWidget(v('div', { styles: { height: undefined } }));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', { styles: { height: '20px' } });

				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="height: 20px;"></div>'
				);
				widget.renderResult = v('div', { styles: { height: '20px' } });
			});

			it('should use the provided styleApplyer', () => {
				const widget = getWidget(v('div', { styles: { height: '20px' } }));
				const styleApplyer = (domNode: any, styleName: string, value: string) => {
					// Useless styleApplyer which transforms height to minHeight
					domNode.style['min' + styleName.substr(0, 1).toUpperCase() + styleName.substr(1)] = value;
				};
				const projection = dom.create(widget, {
					styleApplyer: styleApplyer,
					sync: true
				});
				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="min-height: 20px;"></div>'
				);
				widget.renderResult = v('div', { styles: { height: '30px' } });

				assert.strictEqual(
					(projection.domNode.childNodes[0] as Element).outerHTML,
					'<div style="min-height: 30px;"></div>'
				);
			});
		});

		it('updates the value property', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);
			typedKeys = 'value1';
			widget.renderResult = renderFunction();

			assert.strictEqual(inputElement.value, typedKeys);
		});

		it('does not clear a value that was set by a testing tool (like Ranorex) which manipulates input.value directly', () => {
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			inputElement.value = 'value written by a testing tool without invoking the input event';

			widget.renderResult = renderFunction();

			assert.notStrictEqual(inputElement.value, typedKeys);
		});

		it('Can handle oninput event handlers which pro-actively change element.value to correct user input when typing faster than 60 keys per second', () => {
			let model = '';
			const handleInput = (evt: Event) => {
				const inputElement = evt.target as HTMLInputElement;
				model = inputElement.value;
				if (model.indexOf(',') > 0) {
					model = model.replace(/,/g, '.');
					inputElement.value = model;
				}
			};

			const renderFunction = () => v('input', { value: model, oninput: handleInput });
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });

			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, model);

			inputElement.value = '4';
			sendEvent(inputElement, 'input');
			widget.renderResult = renderFunction();

			inputElement.value = '4,';
			sendEvent(inputElement, 'input');
			widget.renderResult = renderFunction();

			assert.strictEqual(inputElement.value, '4.');

			model = '';
			widget.renderResult = renderFunction();

			assert.strictEqual(inputElement.value, '');
		});

		it('removes the attribute when a role property is set to undefined', () => {
			let role: string | undefined = 'button';
			const renderFunction = () => v('div', { role: role });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const element = projection.domNode.childNodes[0] as Element;

			assert.property(element.attributes, 'role');
			assert.strictEqual(element.getAttribute('role'), role);

			role = undefined;
			widget.renderResult = renderFunction();

			assert.notProperty(element.attributes, 'role');
		});
	});

	describe('diffType', () => {
		it('Should diff against previous properties with diffType `vdom`', () => {
			let vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'vdom';
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'vdom';
			widget.renderResult = vnode;
			assert.strictEqual('baz', root.getAttribute('foo'));
			assert.strictEqual(2, root.bar);
			vnode = v('div', { foo: 'qux', bar: 3 });
			vnode.diffType = 'vdom';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
		});

		it('Should always set properties/attribute with diffType `none`', () => {
			let vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'none';
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'none';
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			vnode = v('div', { foo: 'qux', bar: 3 });
			vnode.diffType = 'none';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
		});

		it('Should diff against values on the DOM with diffType `dom`', () => {
			let vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'dom';
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = v('div', { foo: 'bar', bar: 1 });
			vnode.diffType = 'dom';
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			vnode = v('div', { foo: 'qux', bar: 3 });
			vnode.diffType = 'dom';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
		});

		it('Should use diffType `vdom` by default', () => {
			const widget = getWidget(v('div', { foo: 'bar', bar: 1 }));
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			widget.renderResult = v('div', { foo: 'bar', bar: 1 });
			assert.strictEqual('baz', root.getAttribute('foo'));
			assert.strictEqual(2, root.bar);
			widget.renderResult = v('div', { foo: 'qux', bar: 3 });
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
		});
	});

	describe('dom VNode', () => {
		it('Should diff against previous properties with diffType `vdom`', () => {
			const div = document.createElement('div');
			let clickerCount = 0;
			const click = () => {
				clickerCount++;
			};
			let vnode = d({
				node: div,
				props: { foo: 'bar', bar: 1 },
				attrs: { baz: 'foo', qux: 'qux' },
				on: { click },
				diffType: 'vdom'
			});
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.foo);
			assert.strictEqual('foo', root.getAttribute('baz'));
			assert.strictEqual('qux', root.getAttribute('qux'));
			assert.strictEqual(1, root.bar);
			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 1);

			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = d({
				node: div,
				props: { foo: 'bar', bar: 1 },
				attrs: { baz: undefined, qux: 'qux' },
				on: { click },
				diffType: 'vdom'
			});
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.foo);
			assert.strictEqual(null, root.getAttribute('baz'));
			assert.strictEqual('qux', root.getAttribute('qux'));
			assert.strictEqual(2, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 2);

			vnode = d({
				node: div,
				props: { foo: 'qux', bar: 3 },
				attrs: { baz: 'foo', qux: 'qux' },
				diffType: 'vdom'
			});
			root.baz = 'baz';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.foo);
			assert.strictEqual('foo', root.getAttribute('baz'));
			assert.strictEqual('qux', root.getAttribute('qux'));
			assert.strictEqual(3, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 2);
		});

		it('Should always set properties/attribute with diffType `none`', () => {
			const div = document.createElement('div');
			let clickerCount = 0;
			let secondClickerCount = 0;
			const click = () => {
				clickerCount++;
			};
			const secondClick = () => {
				secondClickerCount++;
			};
			let vnode = d({ node: div, props: { bar: 1 }, attrs: { foo: 'bar' }, on: { click }, diffType: 'none' });
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 1);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = d({
				node: div,
				props: { bar: 1 },
				attrs: { foo: 'bar' },
				on: { click: secondClick },
				diffType: 'none'
			});
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 1);
			assert.strictEqual(secondClickerCount, 1);

			vnode = d({ node: div, props: { bar: 3 }, attrs: { foo: 'qux' }, diffType: 'none' });
			vnode.diffType = 'none';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 1);
			assert.strictEqual(secondClickerCount, 1);
		});

		it('Should diff against values on the DOM with diffType `dom`', () => {
			const div = document.createElement('div');
			let clickerCount = 0;
			const click = () => {
				clickerCount++;
			};
			let vnode = d({ node: div, props: { bar: 1 }, attrs: { foo: 'bar' }, on: { click }, diffType: 'dom' });
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 1);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = d({ node: div, props: { bar: 1 }, attrs: { foo: 'bar' }, on: { click }, diffType: 'dom' });
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 2);
			vnode = d({ node: div, props: { bar: 3 }, attrs: { foo: 'qux' }, diffType: 'dom' });
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
			root.dispatchEvent(clickEvent);
			assert.strictEqual(clickerCount, 2);
		});

		it('Should use diffType `none` by default', () => {
			const div = document.createElement('div');
			let vnode = d({ node: div, props: { bar: 1 }, attrs: { foo: 'bar' } });
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			root.bar = 2;
			root.setAttribute('foo', 'baz');
			vnode = d({ node: div, props: { bar: 1 }, attrs: { foo: 'bar' } });
			widget.renderResult = vnode;
			assert.strictEqual('bar', root.getAttribute('foo'));
			assert.strictEqual(1, root.bar);
			vnode = d({ node: div, props: { bar: 3 }, attrs: { foo: 'qux' } });
			vnode.diffType = 'none';
			widget.renderResult = vnode;
			assert.strictEqual('qux', root.getAttribute('foo'));
			assert.strictEqual(3, root.bar);
		});

		it('Should move a text node to the parent VNode dom node', () => {
			const div = document.createElement('div');
			const text = document.createTextNode('foo');
			div.appendChild(text);
			let vnode = v('div', [d({ node: text })]);
			const widget = getWidget(vnode);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as any;
			assert.strictEqual(root.childNodes.length, 1);
			assert.strictEqual(div.childNodes.length, 0);
			assert.strictEqual((root.childNodes[0] as Text).data, 'foo');
		});
	});

	describe('deferred properties', () => {
		it('can call a callback on render and on the next rAF for vnode properties', () => {
			let deferredCallbackCount = 0;
			let renderCount = 0;

			const renderFunction = () => {
				renderCount++;
				const div = v('div', (inserted) => {
					return {
						inserted,
						deferredCallbackCount: ++deferredCallbackCount,
						key: 'prop'
					};
				});
				(div.properties as any).renderCount = renderCount;
				return div;
			};

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element: any = projection.domNode.childNodes[0];

			assert.strictEqual(element.deferredCallbackCount, 1);
			assert.strictEqual(element.renderCount, 1);
			assert.isFalse(element.inserted);

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.deferredCallbackCount, 2);
			assert.strictEqual(element.renderCount, 1);
			assert.isTrue(element.inserted);

			widget.renderResult = renderFunction();

			resolvers.resolve();

			assert.strictEqual(projection.domNode.childNodes[0], element);
			assert.strictEqual(element.deferredCallbackCount, 4);
			assert.strictEqual(element.renderCount, 2);
			assert.isTrue(element.inserted);
		});

		it('should still allow properties to be decorated on a DNode', () => {
			let foo = 'bar';

			const renderFunction = () => {
				const div = v('div', (inserted) => {
					return {
						foo: 'this should not override the decorated property',
						another: 'property'
					};
				});
				(div.properties as any).foo = foo;
				return div;
			};

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget);
			const element: any = projection.domNode.childNodes[0];

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			// resolve the rAF so deferred properties will run
			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'bar');
			assert.strictEqual(element.getAttribute('another'), 'property');

			foo = 'qux';

			widget.renderResult = renderFunction();

			resolvers.resolve();

			assert.strictEqual(element.getAttribute('foo'), 'qux');
			assert.strictEqual(element.getAttribute('another'), 'property');
		});
	});

	describe('events', () => {
		it('should add an event listener', () => {
			const onclick = stub();
			const renderFunction = () => {
				return v('div', { onclick });
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.isTrue(onclick.called);
		});

		it('should be able to change event listener', () => {
			const onclickFirst = stub();
			const onclickSecond = stub();
			const renderFunction = (updated?: boolean) => {
				return v('div', { onclick: updated ? onclickSecond : onclickFirst });
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.strictEqual(onclickFirst.callCount, 1);

			widget.renderResult = renderFunction(true);

			sendEvent(element, 'click');
			assert.strictEqual(onclickFirst.callCount, 1);
			assert.strictEqual(onclickSecond.callCount, 1);
		});

		it('should be able to drop an event listener across renders', () => {
			const onclick = stub();
			const renderFunction = (updated?: boolean) => {
				const props = updated ? {} : { onclick };
				return v('div', props);
			};
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const element = projection.domNode.childNodes[0] as Element;
			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 1);

			widget.renderResult = renderFunction(true);

			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 1);

			widget.renderResult = renderFunction();

			sendEvent(element, 'click');
			assert.strictEqual(onclick.callCount, 2);
		});

		it('allows one to correct the value while being typed', () => {
			let typedKeys = '';
			const handleInput = (evt: any) => {
				typedKeys = evt.target.value.substr(0, 2);
			};
			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });
			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			inputElement.value = 'ab';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();

			assert.strictEqual(inputElement.value, 'ab');

			inputElement.value = 'abc';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();

			assert.strictEqual(inputElement.value, 'ab');
		});

		it('does not undo keystrokes, even if a browser runs an animationFrame between changing the value property and running oninput', () => {
			// Crazy internet explorer behavior
			let typedKeys = '';
			const handleInput = (evt: Event) => {
				typedKeys = (evt.target as HTMLInputElement).value;
			};

			const renderFunction = () => v('input', { value: typedKeys, oninput: handleInput });

			const widget = getWidget(renderFunction());
			const projection = dom.create(widget, { sync: true });
			const inputElement = (projection.domNode.childNodes[0] as Element) as HTMLInputElement;
			assert.strictEqual(inputElement.value, typedKeys);

			// Normal behavior
			inputElement.value = 'a';
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'a');
			widget.renderResult = renderFunction();

			// Crazy behavior
			inputElement.value = 'ab';
			widget.renderResult = renderFunction();

			assert.strictEqual(typedKeys, 'a');
			assert.strictEqual(inputElement.value, 'ab');
			sendEvent(inputElement, 'input');
			assert.strictEqual(typedKeys, 'ab');
			widget.renderResult = renderFunction();
		});
	});

	describe('children', () => {
		it('can remove child nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 1 }), v('span', { key: 2 }), v('span', { key: 3 })]));
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 1 }), v('span', { key: 3 })]);

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], lastSpan);

			widget.renderResult = v('div', [v('span', { key: 3 })]);

			assert.lengthOf(div.childNodes, 1);
			assert.strictEqual(div.childNodes[0], lastSpan);

			widget.renderResult = v('div');

			assert.lengthOf(div.childNodes, 0);
		});

		it('can add child nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 2 }), v('span', { key: 4 })]));
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [
				v('span', { key: 1 }),
				v('span', { key: 2 }),
				v('span', { key: 3 }),
				v('span', { key: 4 }),
				v('span', { key: 5 })
			]);

			assert.lengthOf(div.childNodes, 5);
			assert.strictEqual(div.childNodes[1], firstSpan);
			assert.strictEqual(div.childNodes[3], lastSpan);
		});

		it('can distinguish between string keys when adding', () => {
			const widget = getWidget(v('div', [v('span', { key: 'one' }), v('span', { key: 'three' })]));
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];

			widget.renderResult = v('div', [
				v('span', { key: 'one' }),
				v('span', { key: 'two' }),
				v('span', { key: 'three' })
			]);

			assert.lengthOf(div.childNodes, 3);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], secondSpan);
		});

		it('can distinguish between falsy keys when replacing', () => {
			const widget = getWidget(
				v('div', [
					v('span', { key: false as any }),
					v('span', { key: null as any }),
					v('span', { key: '' }),
					v('span', {})
				])
			);
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 4);

			const firstSpan = div.childNodes[0];
			const secondSpan = div.childNodes[1];
			const thirdSpan = div.childNodes[2];
			const fourthSpan = div.childNodes[3];

			widget.renderResult = v('div', [v('span', { key: 0 })]);

			assert.lengthOf(div.childNodes, 1);
			const newSpan = div.childNodes[0];

			assert.notStrictEqual(newSpan, firstSpan);
			assert.notStrictEqual(newSpan, secondSpan);
			assert.notStrictEqual(newSpan, thirdSpan);
			assert.notStrictEqual(newSpan, fourthSpan);
		});

		it('can distinguish between string keys when deleting', () => {
			const widget = getWidget(
				v('div', [v('span', { key: 'one' }), v('span', { key: 'two' }), v('span', { key: 'three' })])
			);
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 'one' }), v('span', { key: 'three' })]);

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('can distinguish between falsy keys when deleting', () => {
			const widget = getWidget(
				v('div', [v('span', { key: 0 }), v('span', { key: false as any }), v('span', { key: null as any })])
			);
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 3);
			const firstSpan = div.childNodes[0];
			const thirdSpan = div.childNodes[2];

			widget.renderResult = v('div', [v('span', { key: 0 }), v('span', { key: null as any })]);

			assert.lengthOf(div.childNodes, 2);
			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[1], thirdSpan);
		});

		it('does not reorder nodes based on keys', () => {
			const widget = getWidget(v('div', [v('span', { key: 'a' }), v('span', { key: 'b' })]));
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [v('span', { key: 'b' }), v('span', { key: 'a' })]);

			assert.lengthOf(div.childNodes, 2);
			assert.notStrictEqual(div.childNodes[0], lastSpan);
			assert.notStrictEqual(div.childNodes[1], firstSpan);
		});

		it('can insert text nodes', () => {
			const widget = getWidget(v('div', [v('span', { key: 2 }), v('span', { key: 4 })]));
			const projection = dom.create(widget, { sync: true });

			const div = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(div.childNodes, 2);
			const firstSpan = div.childNodes[0];
			const lastSpan = div.childNodes[1];

			widget.renderResult = v('div', [v('span', { key: 2 }), 'Text between', v('span', { key: 4 })]);

			assert.lengthOf(div.childNodes, 3);

			assert.strictEqual(div.childNodes[0], firstSpan);
			assert.strictEqual(div.childNodes[2], lastSpan);
		});

		it('Can update, insert and remove only affected nodes', () => {
			const widget = getWidget(
				v('div', [
					v('span', { key: '1', id: '1' }),
					v('span', { key: '2', id: '2' }),
					v('span', { key: '3', id: '3' }),
					v('span', { key: '4', id: '4' }),
					v('span', { key: '5', id: '5' }),
					v('span', { key: '6', id: '6' }),
					v('span', { key: '7', id: '7' }),
					v('span', { key: '8', id: '8' }),
					v('span', { key: '9', id: '9' }),
					v('span', { key: '10', id: '10' }),
					v('span', { key: '11', id: '11' }),
					v('span', { key: '12', id: '12' })
				])
			);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			const childOne = root.childNodes[0] as HTMLSpanElement;
			const childTwo = root.childNodes[1] as HTMLSpanElement;
			const childThree = root.childNodes[2] as HTMLSpanElement;
			const childFour = root.childNodes[3] as HTMLSpanElement;
			const childFive = root.childNodes[4] as HTMLSpanElement;
			const childSix = root.childNodes[5] as HTMLSpanElement;
			const childSeven = root.childNodes[6] as HTMLSpanElement;
			const childEight = root.childNodes[7] as HTMLSpanElement;
			const childNine = root.childNodes[8] as HTMLSpanElement;
			const childTen = root.childNodes[9] as HTMLSpanElement;
			const childEleven = root.childNodes[10] as HTMLSpanElement;
			const childTwelve = root.childNodes[11] as HTMLSpanElement;

			widget.renderResult = v('div', [
				v('span', { key: '1', id: '1' }),
				v('span', { key: '8', id: '8' }),
				v('span', { key: '9', id: '9' }),
				v('span', { key: '10', id: '10' }),
				v('span', { key: '6', id: '6' }),
				v('span', { key: '15', id: '15' }),
				v('span', { key: '16', id: '16' }),
				v('span', { key: '17', id: '17' }),
				v('span', { key: '18', id: '18' }),
				v('span', { key: '7', id: '7', href: 'href' }),
				v('span', { key: '2', id: '2' }),
				v('span', { key: '3', id: '3' }),
				v('span', { key: '4', id: '4' }),
				v('span', { key: '11', id: '11' }),
				v('span', { key: '12', id: '12' }),
				v('span', { key: '13', id: '13' })
			]);

			assert.lengthOf(root.childNodes, 16);
			assert.strictEqual(root.childNodes[0], childOne);
			assert.notEqual(root.childNodes[1], childTwo);
			assert.notEqual(root.childNodes[1], childEight);
			assert.notEqual(root.childNodes[2], childThree);
			assert.notEqual(root.childNodes[2], childNine);
			assert.notEqual(root.childNodes[3], childFour);
			assert.notEqual(root.childNodes[3], childTen);
			assert.isNull(childFive.parentNode);
			assert.strictEqual(root.childNodes[4], childSix);
			assert.strictEqual(root.childNodes[9], childSeven);
			assert.strictEqual((root.childNodes[9] as HTMLElement).getAttribute('href'), 'href');
			assert.notEqual(root.childNodes[10], childEight);
			assert.notEqual(root.childNodes[10], childTwo);
			assert.notEqual(root.childNodes[11], childNine);
			assert.notEqual(root.childNodes[11], childThree);
			assert.notEqual(root.childNodes[12], childTen);
			assert.notEqual(root.childNodes[12], childFour);
			assert.strictEqual(root.childNodes[13], childEleven);
			assert.strictEqual(root.childNodes[14], childTwelve);
		});

		it('Can update, insert and remove only affected nodes from widgets', () => {
			class Foo extends WidgetBase<{ id?: string; href?: string }> {
				render() {
					const { key, id, href } = this.properties;
					let properties = href ? { key, id, href } : { key, id };
					return v('span', properties);
				}
			}

			const widget = getWidget(
				v('div', [
					w(Foo, { key: '1', id: '1' }),
					w(Foo, { key: '2', id: '2' }),
					w(Foo, { key: '3', id: '3' }),
					w(Foo, { key: '4', id: '4' }),
					w(Foo, { key: '5', id: '5' }),
					w(Foo, { key: '6', id: '6' }),
					w(Foo, { key: '7', id: '7' }),
					w(Foo, { key: '8', id: '8' }),
					w(Foo, { key: '9', id: '9' }),
					w(Foo, { key: '10', id: '10' }),
					w(Foo, { key: '11', id: '11' }),
					w(Foo, { key: '12', id: '12' })
				])
			);
			const projection = dom.create(widget, { sync: true });
			const root = projection.domNode.childNodes[0] as Element;
			const childOne = root.childNodes[0] as HTMLSpanElement;
			const childTwo = root.childNodes[1] as HTMLSpanElement;
			const childThree = root.childNodes[2] as HTMLSpanElement;
			const childFour = root.childNodes[3] as HTMLSpanElement;
			const childFive = root.childNodes[4] as HTMLSpanElement;
			const childSix = root.childNodes[5] as HTMLSpanElement;
			const childSeven = root.childNodes[6] as HTMLSpanElement;
			const childEight = root.childNodes[7] as HTMLSpanElement;
			const childNine = root.childNodes[8] as HTMLSpanElement;
			const childTen = root.childNodes[9] as HTMLSpanElement;
			const childEleven = root.childNodes[10] as HTMLSpanElement;
			const childTwelve = root.childNodes[11] as HTMLSpanElement;

			widget.renderResult = v('div', [
				w(Foo, { key: '1', id: '1' }),
				w(Foo, { key: '8', id: '8' }),
				w(Foo, { key: '9', id: '9' }),
				w(Foo, { key: '10', id: '10' }),
				w(Foo, { key: '6', id: '6' }),
				w(Foo, { key: '15', id: '15' }),
				w(Foo, { key: '16', id: '16' }),
				w(Foo, { key: '17', id: '17' }),
				w(Foo, { key: '18', id: '18' }),
				w(Foo, { key: '7', id: '7', href: 'href' }),
				w(Foo, { key: '2', id: '2' }),
				w(Foo, { key: '3', id: '3' }),
				w(Foo, { key: '4', id: '4' }),
				w(Foo, { key: '11', id: '11' }),
				w(Foo, { key: '12', id: '12' }),
				w(Foo, { key: '13', id: '13' })
			]);

			assert.lengthOf(root.childNodes, 16);
			assert.strictEqual(root.childNodes[0], childOne);
			assert.notEqual(root.childNodes[1], childTwo);
			assert.notEqual(root.childNodes[1], childEight);
			assert.notEqual(root.childNodes[2], childThree);
			assert.notEqual(root.childNodes[2], childNine);
			assert.notEqual(root.childNodes[3], childFour);
			assert.notEqual(root.childNodes[3], childTen);
			assert.isNull(childFive.parentNode);
			assert.strictEqual(root.childNodes[4], childSix);
			assert.strictEqual(root.childNodes[9], childSeven);
			assert.strictEqual((root.childNodes[9] as HTMLElement).getAttribute('href'), 'href');
			assert.notEqual(root.childNodes[10], childEight);
			assert.notEqual(root.childNodes[10], childTwo);
			assert.notEqual(root.childNodes[11], childNine);
			assert.notEqual(root.childNodes[11], childThree);
			assert.notEqual(root.childNodes[12], childTen);
			assert.notEqual(root.childNodes[12], childFour);
			assert.strictEqual(root.childNodes[13], childEleven);
			assert.strictEqual(root.childNodes[14], childTwelve);
		});

		it('can update single text nodes', () => {
			const widget = getWidget(v('span', ['']));
			const projection = dom.create(widget, { sync: true });
			const span = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [undefined]);

			assert.lengthOf(span.childNodes, 0);

			widget.renderResult = v('span', ['f']);

			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [undefined]);

			assert.lengthOf(span.childNodes, 0);

			widget.renderResult = v('span', ['']);

			assert.lengthOf(span.childNodes, 1);

			widget.renderResult = v('span', [' ']);

			assert.lengthOf(span.childNodes, 1);
		});

		it('Assumes text node where tag is falsy and there is text in the VNode', () => {
			const textVNode: VNode = {
				tag: undefined as any,
				properties: {},
				children: undefined,
				text: 'text-node',
				type: VNODE
			};
			const widget = getWidget(textVNode);
			const projection = dom.create(widget, { sync: true });
			let textNode = projection.domNode.childNodes[0] as Text;
			assert.strictEqual(textNode.data, 'text-node');
			widget.renderResult = {
				tag: undefined as any,
				properties: {},
				children: undefined,
				text: 'text-other',
				type: VNODE
			};
			textNode = projection.domNode.childNodes[0] as Text;
			assert.strictEqual(textNode.data, 'text-other');
		});

		it('Will append text node when VNode has a domNode with no parentNode', () => {
			const domNode = document.createTextNode('text-node');
			const textVNode: InternalVNode = {
				tag: undefined as any,
				properties: {},
				children: undefined,
				text: 'text-node',
				domNode,
				type: VNODE
			};
			const widget = getWidget(textVNode);
			const projection = dom.create(widget, { sync: true });
			const textNode = projection.domNode.childNodes[0] as Text;
			assert.strictEqual(textNode.data, 'text-node');
			assert.notEqual(textNode, domNode);
		});

		it('Should ignore vnode with no tag or text', () => {
			const domNode = document.createTextNode('text-node');
			const textVNode: InternalVNode = {
				tag: undefined as any,
				properties: {},
				children: undefined,
				text: undefined,
				domNode,
				type: VNODE
			};
			const widget = getWidget(textVNode);
			const projection = dom.create(widget, { sync: true });
			let textNode = projection.domNode.childNodes[0] as Text;
			assert.strictEqual(textNode, domNode);
			widget.renderResult = { ...textVNode } as any;
			textNode = projection.domNode.childNodes[0] as Text;
			assert.strictEqual(textNode, domNode);
		});

		it('will throw an error when vdom is not sure which node is added', () => {
			const widgetName = 'span';
			const widget = getWidget(v('div', [v('span', ['a']), v('span', ['c'])]));
			const parentName = (widget.constructor as any).name || 'unknown';
			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			dom.create(widget);

			assert.isTrue(consoleStub.notCalled);

			widget.renderResult = v('div', [v('span', ['a']), v('span', ['b']), v('span', ['c'])]);

			resolvers.resolve();

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		it('will throw an error when vdom is not sure which node is removed', () => {
			const widgetName = 'span';
			const widget = getWidget(v('div', [v('span', ['a']), v('span', ['b']), v('span', ['c'])]));
			const parentName = (widget.constructor as any).name || 'unknown';
			const errorMsg = `A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${widgetName}) multiple times as siblings`;

			dom.create(widget);

			assert.isTrue(consoleStub.notCalled);

			widget.renderResult = v('div', [v('span', ['a']), v('span', ['c'])]);

			resolvers.resolve();

			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(errorMsg));
		});

		it('allows a contentEditable tag to be altered', () => {
			let text = 'initial value';
			const handleInput = (evt: any) => {
				text = evt.currentTarget.innerHTML;
			};
			const renderDNodes = () =>
				v('div', {
					contentEditable: true,
					oninput: handleInput,
					innerHTML: text
				});
			const widget = getWidget(renderDNodes());
			const projection = dom.create(widget, { sync: true });

			(projection.domNode.childNodes[0] as Element).removeChild(
				(projection.domNode.childNodes[0] as Element).childNodes[0]
			);
			handleInput({ currentTarget: projection.domNode.childNodes[0] as Element });
			widget.renderResult = renderDNodes();

			(projection.domNode.childNodes[0] as Element).innerHTML = 'changed <i>value</i>';
			handleInput({ currentTarget: projection.domNode.childNodes[0] as Element });
			widget.renderResult = renderDNodes();

			assert.strictEqual((projection.domNode.childNodes[0] as Element).innerHTML, 'changed <i>value</i>');
		});

		describe('svg', () => {
			it('creates and updates svg dom nodes with the right namespace', () => {
				const widget = getWidget(
					v('div', [
						v('svg', [
							v('circle', { cx: '2cm', cy: '2cm', r: '1cm', fill: 'red' }),
							v('image', { href: '/image.jpeg' })
						]),
						v('span')
					])
				);
				const projection = dom.create(widget, { sync: true });
				const svg = (projection.domNode.childNodes[0] as Element).childNodes[0];
				assert.strictEqual(svg.namespaceURI, 'http://www.w3.org/2000/svg');
				const circle = svg.childNodes[0];
				assert.strictEqual(circle.namespaceURI, 'http://www.w3.org/2000/svg');
				const image = svg.childNodes[1];
				assert.strictEqual(image.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
				const span = (projection.domNode.childNodes[0] as Element).childNodes[1];
				assert.strictEqual(span.namespaceURI, 'http://www.w3.org/1999/xhtml');

				widget.renderResult = v('div', [
					v('svg', [
						v('circle', { key: 'blue', cx: '2cm', cy: '2cm', r: '1cm', fill: 'blue' }),
						v('image', { href: '/image2.jpeg' })
					]),
					v('span')
				]);

				const blueCircle = svg.childNodes[0];
				assert.strictEqual(blueCircle.namespaceURI, 'http://www.w3.org/2000/svg');
			});
		});
	});

	describe('merging', () => {
		it('Supports merging DNodes onto existing HTML', () => {
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write(
				`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button></div>`
			);
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;
			const childElementCount = root.childElementCount;
			const select = root.childNodes[1] as HTMLSelectElement;
			const button = root.childNodes[2] as HTMLButtonElement;
			assert.strictEqual(select.value, 'bar', 'bar should be selected');
			const onclickListener = spy();
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							v(
								'button',
								{
									type: 'button',
									disabled: false,
									onclick: onclickListener
								},
								['Click Me!']
							)
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
			assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
			assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
			assert.strictEqual(select, root.childNodes[1], 'should have been reused');
			assert.strictEqual(button, root.childNodes[2], 'should have been reused');
			assert.isFalse(select.disabled, 'select should be enabled');
			assert.isFalse(button.disabled, 'button should be enabled');

			assert.strictEqual(select.value, 'foo', 'foo should be selected');
			assert.strictEqual(select.children.length, 3, 'should have 3 children');

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			button.dispatchEvent(clickEvent);
			assert.isTrue(onclickListener.called, 'onclickListener should have been called');

			document.body.removeChild(iframe);
		});

		it('Supports merging DNodes with widgets onto existing HTML', () => {
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write(
				`<div class="foo"><label for="baz">Select Me:</label><select type="text" name="baz" id="baz" disabled="disabled"><option value="foo">label foo</option><option value="bar" selected="">label bar</option><option value="baz">label baz</option></select><button type="button" disabled="disabled">Click Me!</button><span>label</span><div>last node</div></div>`
			);
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;
			const childElementCount = root.childElementCount;
			const label = root.childNodes[0] as HTMLLabelElement;
			const select = root.childNodes[1] as HTMLSelectElement;
			const button = root.childNodes[2] as HTMLButtonElement;
			const span = root.childNodes[3] as HTMLElement;
			const div = root.childNodes[4] as HTMLElement;
			assert.strictEqual(select.value, 'bar', 'bar should be selected');
			const onclickListener = spy();

			class Button extends WidgetBase {
				render() {
					return [
						v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
						v('span', {}, ['label'])
					];
				}
			}
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							w(Button, {}),
							v('div', ['last node'])
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
			assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
			assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
			assert.strictEqual(label, root.childNodes[0], 'should have been reused');
			assert.strictEqual(select, root.childNodes[1], 'should have been reused');
			assert.strictEqual(button, root.childNodes[2], 'should have been reused');
			assert.strictEqual(span, root.childNodes[3], 'should have been reused');
			assert.strictEqual(div, root.childNodes[4], 'should have been reused');
			assert.isFalse(select.disabled, 'select should be enabled');
			assert.isFalse(button.disabled, 'button should be enabled');

			assert.strictEqual(select.value, 'foo', 'foo should be selected');
			assert.strictEqual(select.children.length, 3, 'should have 3 children');

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			button.dispatchEvent(clickEvent);
			assert.isTrue(onclickListener.called, 'onclickListener should have been called');

			document.body.removeChild(iframe);
		});

		it('Skips unknown nodes when merging', () => {
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write(`
				<div class="foo">
					<label for="baz">Select Me:</label>
					<select type="text" name="baz" id="baz" disabled="disabled">
						<option value="foo">label foo</option>
						<option value="bar" selected="">label bar</option>
						<option value="baz">label baz</option>
					</select>
					<button type="button" disabled="disabled">Click Me!</button>
					<span>label</span>
					<div>last node</div>
				</div>`);
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;
			const childElementCount = root.childElementCount;
			const label = root.childNodes[1] as HTMLLabelElement;
			const select = root.childNodes[3] as HTMLSelectElement;
			const button = root.childNodes[5] as HTMLButtonElement;
			const span = root.childNodes[7] as HTMLElement;
			const div = root.childNodes[9] as HTMLElement;
			assert.strictEqual(select.value, 'bar', 'bar should be selected');
			const onclickListener = spy();

			class Button extends WidgetBase {
				render() {
					return [
						v('button', { type: 'button', disabled: false, onclick: onclickListener }, ['Click Me!']),
						v('span', {}, ['label'])
					];
				}
			}
			class Foo extends WidgetBase {
				render() {
					return v(
						'div',
						{
							classes: ['foo', 'bar']
						},
						[
							v(
								'label',
								{
									for: 'baz'
								},
								['Select Me:']
							),
							v(
								'select',
								{
									type: 'text',
									name: 'baz',
									id: 'baz',
									disabled: false
								},
								[
									v('option', { value: 'foo', selected: true }, ['label foo']),
									v('option', { value: 'bar', selected: false }, ['label bar']),
									v('option', { value: 'baz', selected: false }, ['label baz'])
								]
							),
							w(Button, {}),
							v('div', ['last node'])
						]
					);
				}
			}
			const widget = new Foo();
			dom.merge(root, widget);
			assert.strictEqual(root.className, 'foo bar', 'should have added bar class');
			assert.strictEqual(root.childElementCount, childElementCount, 'should have the same number of children');
			assert.strictEqual(label, root.childNodes[1], 'should have been reused');
			assert.strictEqual(select, root.childNodes[3], 'should have been reused');
			assert.strictEqual(button, root.childNodes[5], 'should have been reused');
			assert.strictEqual(span, root.childNodes[7], 'should have been reused');
			assert.strictEqual(div, root.childNodes[9], 'should have been reused');
			assert.isFalse(select.disabled, 'select should be enabled');
			assert.isFalse(button.disabled, 'button should be enabled');

			assert.strictEqual(select.value, 'foo', 'foo should be selected');
			assert.strictEqual(select.children.length, 3, 'should have 3 children');

			assert.isFalse(onclickListener.called, 'onclickListener should not have been called');

			const clickEvent = document.createEvent('CustomEvent');
			clickEvent.initEvent('click', true, true);
			button.dispatchEvent(clickEvent);
			assert.isTrue(onclickListener.called, 'onclickListener should have been called');

			document.body.removeChild(iframe);
		});

		it('should only merge on first render', () => {
			let firstRender = true;
			const iframe = document.createElement('iframe');
			document.body.appendChild(iframe);
			iframe.contentDocument.write('<div><div>foo</div></div>');
			iframe.contentDocument.close();
			const root = iframe.contentDocument.body.firstChild as HTMLElement;

			class Bar extends WidgetBase<any> {
				render() {
					return v('div', [this.properties.value]);
				}
			}

			class Foo extends WidgetBase {
				render() {
					return v('div', [
						w(Bar, { key: '1', value: 'foo' }),
						firstRender ? null : w(Bar, { key: '2', value: 'bar' })
					]);
				}
			}
			const widget = new Foo();
			const projection = dom.merge(root, widget, { sync: true });
			const projectionRoot = projection.domNode.childNodes[0] as Element;
			assert.lengthOf(projectionRoot.childNodes, 1, 'should have 1 child');

			firstRender = false;
			widget.invalidate();

			assert.lengthOf(projectionRoot.childNodes, 2, 'should have 2 child');
			document.body.removeChild(iframe);
		});
	});

	describe('sync mode', () => {
		it('should run afterRenderCallbacks sync', () => {
			const widget = getWidget(v('div', { key: '1' }));
			const projection = dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
		});

		it('should run defferedRenderCallbacks sync', () => {
			let callCount = 0;
			const widget = getWidget(
				v('div', () => {
					callCount++;
					return {};
				})
			);
			dom.create(widget, { sync: true });
			assert.strictEqual(callCount, 2);
		});
	});

	describe('node callbacks', () => {
		it('element not added to node handler for nodes without a key', () => {
			const widget = getWidget(v('div'));
			dom.create(widget);
			resolvers.resolve();
			widget.renderResult = v('div');

			resolvers.resolve();
			assert.isTrue(widget.nodeHandlerStub.add.notCalled);
		});

		it('element added on create to node handler for nodes with a key', () => {
			const widget = getWidget(v('div', { key: '1' }));
			const projection = dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
			widget.nodeHandlerStub.add.resetHistory();
			widget.renderResult = v('div', { key: '1' });

			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '1'));
		});

		it('element added on update to node handler for nodes with a key of 0', () => {
			const widget = getWidget(v('div', { key: 0 }));
			const projection = dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '0'));
			widget.nodeHandlerStub.add.resetHistory();
			widget.renderResult = v('div', { key: 0 });

			assert.isTrue(widget.nodeHandlerStub.add.called);
			assert.isTrue(widget.nodeHandlerStub.add.calledWith(projection.domNode.childNodes[0] as Element, '0'));
		});

		it('addRoot called on node handler for created widgets with a zero key', () => {
			const widget = getWidget(v('div', { key: 0 }));
			widget.__setProperties__({ key: 0 });

			dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
			widget.invalidate();

			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
		});

		it('addRoot called on node handler for updated widgets with key', () => {
			const widget = getWidget(v('div', { key: '1' }));

			dom.create(widget, { sync: true });
			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
			widget.nodeHandlerStub.addRoot.resetHistory();
			widget.invalidate();

			assert.isTrue(widget.nodeHandlerStub.addRoot.called);
		});
	});

	describe('animations', () => {
		describe('updateAnimation', () => {
			it('is invoked when a node contains only text and that text changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('div', { updateAnimation }, ['text']));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', { updateAnimation }, ['text2']);

				assert.isTrue(updateAnimation.calledOnce);
				assert.strictEqual((projection.domNode.childNodes[0] as Element).outerHTML, '<div>text2</div>');
			});

			it('is invoked when a node contains text and other nodes and the text changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('div', { updateAnimation }, ['textBefore', v('span'), 'textAfter']));
				dom.create(widget, { sync: true });
				widget.renderResult = v('div', { updateAnimation }, ['textBefore', v('span'), 'newTextAfter']);

				assert.isTrue(updateAnimation.calledOnce);
				updateAnimation.resetHistory();

				widget.renderResult = v('div', { updateAnimation }, ['textBefore', v('span'), 'newTextAfter']);

				assert.isTrue(updateAnimation.notCalled);
			});

			it('is invoked when a property changes', () => {
				const updateAnimation = stub();
				const widget = getWidget(v('a', { updateAnimation, href: '#1' }));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('a', { updateAnimation, href: '#2' });

				assert.isTrue(
					updateAnimation.calledWith(
						projection.domNode.childNodes[0] as Element,
						match({ href: '#2' }),
						match({ href: '#1' })
					)
				);
			});
		});

		describe('enterAnimation', () => {
			it('is invoked when a new node is added to an existing parent node', () => {
				const enterAnimation = stub();
				const widget = getWidget(v('div', []));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', [v('span', { enterAnimation })]);

				assert.isTrue(
					enterAnimation.calledWith((projection.domNode.childNodes[0] as Element).childNodes[0], match({}))
				);
			});
		});

		describe('exitAnimation', () => {
			it('is invoked when a node is removed from an existing parent node', () => {
				const exitAnimation = stub();
				const widget = getWidget(v('div', [v('span', { exitAnimation })]));
				const projection = dom.create(widget, { sync: true });
				widget.renderResult = v('div', []);

				assert.isTrue(
					exitAnimation.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).childNodes[0],
						match({}),
						match({})
					)
				);

				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 1);
				exitAnimation.lastCall.callArg(1); // arg1: removeElement
				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 0);
			});
		});

		describe('transitionStrategy', () => {
			it('will be invoked when enterAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const widget = getWidget(v('div'));
				const projection = dom.create(widget, { transitions: transitionStrategy, sync: true });
				widget.renderResult = v('div', [v('span', { enterAnimation: 'fadeIn' })]);

				assert.isTrue(
					transitionStrategy.enter.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).firstChild,
						match({}),
						'fadeIn'
					)
				);
			});

			it('will be invoked when exitAnimation is provided as a string', () => {
				const transitionStrategy = { enter: stub(), exit: stub() };
				const widget = getWidget(v('div', [v('span', { exitAnimation: 'fadeOut' })]));
				const projection = dom.create(widget, {
					transitions: transitionStrategy,
					sync: true
				});
				widget.renderResult = v('div', []);

				assert.isTrue(
					transitionStrategy.exit.calledWithExactly(
						(projection.domNode.childNodes[0] as Element).firstChild,
						match({}),
						'fadeOut',
						match({})
					)
				);

				transitionStrategy.exit.lastCall.callArg(3);
				assert.lengthOf((projection.domNode.childNodes[0] as Element).childNodes, 0);
			});

			it('will complain about a missing transitionStrategy', () => {
				const widget = getWidget(v('div'));
				dom.create(widget, { sync: true });

				assert.throws(() => {
					widget.renderResult = v('div', [v('span', { enterAnimation: 'fadeIn' })]);
				});
			});
		});
	});

	describe('focus', () => {
		it('focus is only called once when set to true', () => {
			const widget = getWidget(
				v('input', {
					focus: true
				})
			);
			const projection = dom.append(document.body, widget);
			const input = projection.domNode.lastChild as HTMLElement;
			const focusSpy = spy(input, 'focus');
			resolvers.resolve();
			assert.isTrue(focusSpy.calledOnce);
			widget.renderResult = v('input', { focus: true });
			assert.isTrue(focusSpy.calledOnce);
			document.body.removeChild(input);
		});

		it('focus is called when focus property is set to true from false', () => {
			const widget = getWidget(
				v('input', {
					focus: false
				})
			);
			const projection = dom.append(document.body, widget);
			const input = projection.domNode.lastChild as HTMLElement;
			const focusSpy = spy(input, 'focus');
			resolvers.resolve();
			assert.isTrue(focusSpy.notCalled);
			widget.renderResult = v('input', { focus: true });
			resolvers.resolve();
			assert.isTrue(focusSpy.calledOnce);
			document.body.removeChild(input);
		});

		it('Should focus if function for focus returns true', () => {
			const shouldFocus = () => {
				return true;
			};
			const widget = getWidget(
				v('input', {
					focus: shouldFocus
				})
			);
			const projection = dom.append(document.body, widget);
			const input = projection.domNode.lastChild as HTMLElement;
			const focusSpy = spy(input, 'focus');
			resolvers.resolve();
			assert.isTrue(focusSpy.calledOnce);
			widget.renderResult = v('input', { focus: shouldFocus });
			resolvers.resolve();
			assert.isTrue(focusSpy.calledTwice);
			document.body.removeChild(input);
		});

		it('Should never focus if function for focus returns false', () => {
			const shouldFocus = () => false;
			const widget = getWidget(
				v('input', {
					focus: shouldFocus
				})
			);
			const projection = dom.append(document.body, widget);
			const input = projection.domNode.lastChild as HTMLElement;
			const focusSpy = spy(input, 'focus');
			resolvers.resolve();
			assert.isTrue(focusSpy.notCalled);
			widget.renderResult = v('input', { focus: shouldFocus });
			resolvers.resolve();
			assert.isTrue(focusSpy.notCalled);
			document.body.removeChild(input);
		});
	});

	describe('i18n Mixin', () => {
		class MyWidget extends I18nMixin(WidgetBase) {
			render() {
				return v('span');
			}
		}
		const widget = new MyWidget();
		const projection = dom.create(widget, { sync: true });
		const root = projection.domNode.childNodes[0] as HTMLElement;
		assert.strictEqual(root.dir, '');
		widget.__setProperties__({ rtl: true });
		assert.strictEqual(root.dir, 'rtl');
		widget.__setProperties__({ rtl: false });
		assert.strictEqual(root.dir, 'ltr');
	});
});
