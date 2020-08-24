import global from '../../../src/shim/global';
import { reference } from '../../../src/core/diff';
import diffProperty from '../../../src/core/decorators/diffProperty';
import customElement from '../../../src/core/decorators/customElement';
import WidgetBase from '../../../src/core/WidgetBase';
import Container from '../../../src/core/Container';
import Registry from '../../../src/core/Registry';
import { v, w } from '../../../src/core/vdom';
import register, { create, CustomElementChildType } from '../../../src/core/registerCustomElement';
import { createResolvers } from '../support/util';
import { ThemedMixin, theme } from '../../../src/core/mixins/Themed';
import { waitFor } from './waitFor';

const { describe, it, beforeEach, afterEach, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

@customElement({
	tag: 'foo-element'
})
class Foo extends WidgetBase {
	render() {
		return v('div', ['hello world']);
	}
}

@customElement({
	tag: 'display-element-inline-block'
})
class DisplayElement extends WidgetBase {
	render() {
		return v('div', { styles: { display: 'inline-block' } }, ['hello world']);
	}
}

@customElement({
	tag: 'display-element-default-block'
})
class DisplayElementDefault extends WidgetBase {
	render() {
		return v('div', ['hello world']);
	}
}

@customElement({
	tag: 'delayed-children-element',
	childType: CustomElementChildType.TEXT
})
class DelayedChildrenWidget extends WidgetBase {
	render() {
		return v(
			'div',
			{},
			this.children.map((child, i) =>
				v(
					'div',
					{
						'data-key': `child-${i}`
					},
					[child]
				)
			)
		);
	}
}

function createTestWidget(options: any) {
	const { properties, attributes, events, childType = CustomElementChildType.DOJO, auto = false } = options;
	@customElement<any>({
		tag: 'bar-element',
		properties,
		attributes,
		events,
		childType: auto ? undefined : childType
	})
	@diffProperty('onExternalFunction', reference)
	class Bar extends WidgetBase<any> {
		private _called = false;

		private _onClick() {
			const { onBar } = this.properties;
			onBar && onBar();
		}
		render() {
			let childProp = '';
			if (this.children.length) {
				const [child] = this.children;
				if (childType === CustomElementChildType.DOJO) {
					(child as any).properties.myAttr = 'set attribute from parent';
					(child as any).properties.onBar = () => {
						this._called = true;
						this.invalidate();
					};
					if ((child as any).properties.myProp) {
						childProp = (child as any).properties.myProp;
					}
				} else if (childType === CustomElementChildType.NODE) {
					childProp = (child as any).properties.myProp = 'can write prop to dom node';
				}
			}
			const { myProp = '', myAttr = '', onExternalFunction } = this.properties;
			if (onExternalFunction) {
				onExternalFunction('hello');
			}
			return v('div', { styles: { display: 'inline-block' } }, [
				v('button', { classes: ['event'], onclick: this._onClick }),
				v('div', { classes: ['prop'] }, [`${myProp}`]),
				v('div', { classes: ['attr'] }, [`${myAttr}`]),
				v('div', { classes: ['handler'] }, [`${this._called}`]),
				v('div', { classes: ['childProp'] }, [`${childProp}`]),
				v('div', { classes: ['children'] }, this.children)
			]);
		}
	}
	return () => Bar;
}

@customElement({ tag: 'themed-element' })
@theme({ ' _key': 'themedWidget', foo: 'bar' })
class ThemedWidget extends ThemedMixin(WidgetBase) {
	render() {
		return v('div', { classes: ['root'] }, [this.theme('bar'), this.variant()]);
	}
}

describe('registerCustomElement', () => {
	let element: Element | undefined;
	const resolvers = createResolvers();

	before((suite) => {
		try {
			const Test = createTestWidget({ childType: CustomElementChildType.DOJO });
			const CustomElement = create((Test as any).__customElementDescriptor, Test);
			customElements.define('supports-custom-elements', CustomElement);
			document.createElement('supports-custom-elements');
		} catch (e) {
			suite.skip();
		}
	});

	beforeEach(() => {
		resolvers.stub();
	});

	afterEach(() => {
		resolvers.restore();
		if (element) {
			(element.parentNode as Element).removeChild(element);
		}
		element = undefined;
		delete global.dojo;
		global.dojoce = {};
	});

	it('throws error when no descriptor found', () => {
		assert.throws(
			() => register({}),
			'Cannot get descriptor for Custom Element, have you added the @customElement decorator to your Widget?'
		);
	});

	it('custom element', () => {
		register(Foo);
		element = document.createElement('foo-element');
		document.body.appendChild(element);
		assert.equal(element.outerHTML, '<foo-element style="display: block;"><div>hello world</div></foo-element>');
	});

	it('custom element with descriptor', () => {
		register(Foo, (Foo as any).__customElementDescriptor);
		element = document.createElement('foo-element');
		document.body.appendChild(element);
		assert.equal(element.outerHTML, '<foo-element style="display: block;"><div>hello world</div></foo-element>');
	});

	it('throws with no descriptor', () => {
		assert.throws(() => {
			register(Foo, false);
		});
	});

	it('custom element with property', () => {
		const Bar = createTestWidget({ properties: ['myProp'], childType: CustomElementChildType.DOJO });
		const CustomElement = create((Bar as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-1', CustomElement);
		element = document.createElement('bar-element-1');
		(element as any).myProp = 'hello';
		document.body.appendChild(element);
		const prop = element.querySelector('.prop') as HTMLElement;
		assert.equal(prop.innerHTML, 'hello');
	});

	it('custom element with attribute', () => {
		const Bar = createTestWidget({ attributes: ['myAttr'], childType: CustomElementChildType.DOJO });
		const CustomElement = create((Bar as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-2', CustomElement);
		element = document.createElement('bar-element-2');
		element.setAttribute('myAttr', 'world');
		document.body.appendChild(element);
		const attr = element.querySelector('.attr') as HTMLElement;
		assert.equal(attr.innerHTML, 'world');
	});

	it('custom element with event', () => {
		let called = false;
		const Bar = createTestWidget({ events: ['onBar'], childType: CustomElementChildType.DOJO });
		const CustomElement = create((Bar as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-3', CustomElement);
		element = document.createElement('bar-element-3');
		element.addEventListener('bar', () => {
			called = true;
		});
		document.body.appendChild(element);
		const event = element.querySelector('.event') as HTMLElement;
		event.click();
		assert.isTrue(called);
	});

	it('custom element with child dojo element', () => {
		const BarA = createTestWidget({ childType: CustomElementChildType.DOJO, auto: true });
		const CustomElementA = create((BarA as any).__customElementDescriptor, BarA);
		customElements.define('bar-a', CustomElementA);
		const BarB = createTestWidget({
			attributes: ['myAttr'],
			properties: ['myProp'],
			events: ['onBar'],
			childType: CustomElementChildType.DOJO
		});
		const CustomElementB = create((BarB as any).__customElementDescriptor, BarB);
		customElements.define('bar-b', CustomElementB);
		element = document.createElement('bar-a');
		const barB = document.createElement('bar-b');
		let childRenderCounter = 0;
		element.addEventListener('dojo-ce-render', () => {
			childRenderCounter++;
		});
		element.appendChild(barB);
		document.body.appendChild(element);
		(barB as any).set('myProp', 'set property on child');
		resolvers.resolve();

		assert.strictEqual(3, childRenderCounter);

		const container = element.querySelector('.children');
		const children = (container as any).children;
		let called = false;
		children[0].addEventListener('bar', () => {
			called = true;
		});
		const event = children[0].querySelector('.event') as HTMLElement;
		event.click();

		const childProp = element.querySelector('.childProp') as HTMLElement;

		assert.equal(children[0].tagName, 'BAR-B');
		const attr = children[0].querySelector('.attr');
		const prop = children[0].querySelector('.prop');
		assert.equal(attr.innerHTML, 'set attribute from parent');
		assert.equal(prop.innerHTML, 'set property on child');
		assert.equal(childProp.innerHTML, 'set property on child');
		assert.isTrue(called);

		resolvers.resolve();
		const handler = element.querySelector('.handler') as HTMLElement;
		assert.equal(handler.innerHTML, 'true');
	});

	it('custom element with child dom node', () => {
		const BazA = createTestWidget({ childType: CustomElementChildType.NODE });
		const CustomElementA = create((BazA as any).__customElementDescriptor, BazA);
		customElements.define('baz-a', CustomElementA);
		element = document.createElement('baz-a');
		const div = document.createElement('div');
		div.innerHTML = 'hello world';
		element.appendChild(div);
		document.body.appendChild(element);
		const children = element.querySelector('.children') as HTMLElement;
		const child = children.firstChild as HTMLElement;
		assert.equal(child.innerHTML, 'hello world');
		assert.equal((child as any).myProp, 'can write prop to dom node');
	});

	it('custom element with child text node', () => {
		const QuxA = createTestWidget({ childType: CustomElementChildType.TEXT });
		const CustomElementA = create((QuxA as any).__customElementDescriptor, QuxA);
		customElements.define('qux-a', CustomElementA);
		element = document.createElement('qux-a');
		const textNode = document.createTextNode('text node');
		element.appendChild(textNode);
		document.body.appendChild(element);
		const children = element.querySelector('.children') as HTMLElement;
		const child = children.firstChild as HTMLElement;
		assert.equal(child.nodeType, Node.TEXT_NODE);
		assert.equal(child.textContent, 'text node');
	});

	it('custom element with auto detection of child dojo element', () => {
		const BarA = createTestWidget({ auto: true });
		const CustomElementA = create((BarA as any).__customElementDescriptor, BarA);
		customElements.define('auto-bar-a', CustomElementA);
		const BarB = createTestWidget({
			attributes: ['myAttr'],
			properties: ['myProp'],
			events: ['onBar'],
			childType: CustomElementChildType.DOJO,
			auto: true
		});
		const CustomElementB = create((BarB as any).__customElementDescriptor, BarB);
		customElements.define('auto-bar-b', CustomElementB);
		element = document.createElement('auto-bar-a');
		const barB = document.createElement('auto-bar-b');
		let childRenderCounter = 0;
		element.addEventListener('dojo-ce-render', () => {
			childRenderCounter++;
		});
		element.appendChild(barB);
		document.body.appendChild(element);
		(barB as any).set('myProp', 'set property on child');
		resolvers.resolve();

		assert.strictEqual(3, childRenderCounter);

		const container = element.querySelector('.children');
		const children = (container as any).children;
		let called = false;
		children[0].addEventListener('bar', () => {
			called = true;
		});
		const event = children[0].querySelector('.event') as HTMLElement;
		event.click();

		const childProp = element.querySelector('.childProp') as HTMLElement;

		assert.equal(children[0].tagName, 'AUTO-BAR-B');
		const attr = children[0].querySelector('.attr');
		const prop = children[0].querySelector('.prop');
		assert.equal(attr.innerHTML, 'set attribute from parent');
		assert.equal(prop.innerHTML, 'set property on child');
		assert.equal(childProp.innerHTML, 'set property on child');
		assert.isTrue(called);

		resolvers.resolve();
		const handler = element.querySelector('.handler') as HTMLElement;
		assert.equal(handler.innerHTML, 'true');
	});

	it('custom element with auto detected node child type', () => {
		const BazA = createTestWidget({ auto: true, childType: CustomElementChildType.NODE });
		const CustomElementA = create((BazA as any).__customElementDescriptor, BazA);
		customElements.define('auto-baz-a', CustomElementA);
		element = document.createElement('auto-baz-a');
		const div = document.createElement('div');
		div.innerHTML = 'hello world';
		element.appendChild(div);
		document.body.appendChild(element);
		const children = element.querySelector('.children') as HTMLElement;
		const child = children.firstChild as HTMLElement;
		assert.equal(child.innerHTML, 'hello world');
		assert.equal((child as any).myProp, 'can write prop to dom node');
	});

	it('custom element with auto detected text child type', () => {
		const QuxA = createTestWidget({ auto: true, childType: CustomElementChildType.TEXT });
		const CustomElementA = create((QuxA as any).__customElementDescriptor, QuxA);
		customElements.define('auto-qux-a', CustomElementA);
		element = document.createElement('auto-qux-a');
		const textNode = document.createTextNode('text node');
		element.appendChild(textNode);
		document.body.appendChild(element);
		const children = element.querySelector('.children') as HTMLElement;
		const child = children.firstChild as HTMLElement;
		assert.equal(child.nodeType, Node.TEXT_NODE);
		assert.equal(child.textContent, 'text node');
	});

	it('custom element with global theme', () => {
		const CustomElement = create((ThemedWidget as any).__customElementDescriptor, () =>
			Promise.resolve(ThemedWidget)
		);
		customElements.define('themed-element', CustomElement);
		element = document.createElement('themed-element');
		document.body.appendChild(element);
		global.dojoce = {
			theme: 'dojo',
			themes: {
				dojo: {
					themedWidget: {
						foo: 'baz'
					}
				}
			}
		};
		global.dispatchEvent(new CustomEvent('dojo-theme-set', {}));
		const root = element.querySelector('.root') as HTMLElement;
		assert.equal(root.innerHTML, 'bar');
		resolvers.resolve();
		assert.equal(root.innerHTML, 'baz');
	});

	it('custom element with global theme and default variant', () => {
		const CustomElement = create((ThemedWidget as any).__customElementDescriptor, () =>
			Promise.resolve(ThemedWidget)
		);
		customElements.define('themed-element-default-variant', CustomElement);
		element = document.createElement('themed-element-default-variant');
		document.body.appendChild(element);
		global.dojoce = {
			theme: 'dojo',
			themes: {
				dojo: {
					theme: {
						themedWidget: {
							foo: 'baz'
						}
					},
					variants: {
						default: {
							root: 'default variant'
						},
						light: {
							root: 'light variant'
						}
					}
				}
			}
		};
		global.dispatchEvent(new CustomEvent('dojo-theme-set', {}));
		const root = element.querySelector('.root') as HTMLElement;
		assert.equal(root.innerHTML, 'bar');
		resolvers.resolve();
		assert.equal(root.innerHTML, 'bazdefault variant');
	});

	it('custom element with global theme and custom variant', () => {
		const CustomElement = create((ThemedWidget as any).__customElementDescriptor, () =>
			Promise.resolve(ThemedWidget)
		);
		customElements.define('themed-element-custom-variant', CustomElement);
		element = document.createElement('themed-element-custom-variant');
		document.body.appendChild(element);
		global.dojoce = {
			theme: 'dojo',
			variant: 'light',
			themes: {
				dojo: {
					theme: {
						themedWidget: {
							foo: 'baz'
						}
					},
					variants: {
						default: {
							root: 'default variant'
						},
						light: {
							root: 'light variant'
						}
					}
				}
			}
		};
		global.dispatchEvent(new CustomEvent('dojo-theme-set', {}));
		const root = element.querySelector('.root') as HTMLElement;
		assert.equal(root.innerHTML, 'bar');
		resolvers.resolve();
		assert.equal(root.innerHTML, 'bazlight variant');
	});

	it('custom element with registry factory', () => {
		class Foo extends WidgetBase<any> {
			render() {
				return this.properties.text;
			}
		}

		const FooContainer = Container(Foo, 'state', {
			getProperties: (inject: any) => {
				return {
					text: inject.text
				};
			}
		});

		const registry = new Registry();
		const injector = () => () => ({ text: 'foo' });
		registry.defineInjector('state', injector);

		@customElement<any>({
			tag: 'bar-element',
			registryFactory: () => registry
		})
		class Bar extends WidgetBase {
			render() {
				return w(FooContainer, {});
			}
		}

		const CustomElement = create((Bar as any).__customElementDescriptor, () => Promise.resolve(Bar));
		customElements.define('registry-element', CustomElement);
		element = document.createElement('registry-element');
		element.id = 'registry-element';
		document.body.appendChild(element);

		const registryElement = document.getElementById('registry-element') as HTMLElement;
		const child = registryElement.firstChild as HTMLElement;
		assert.equal(child.nodeType, Node.TEXT_NODE);
		assert.equal(child.textContent, 'foo');
	});

	it('custom element with function property', () => {
		const Widget = createTestWidget({ properties: ['onExternalFunction'] });
		const CustomElement = create((Widget as any).__customElementDescriptor, Widget);
		customElements.define('function-property-element', CustomElement);
		element = document.createElement('function-property-element');
		document.body.appendChild(element);

		let functionText = '';
		let scope: any;

		(element as any).onExternalFunction = function(text: string) {
			functionText = text;
			scope = this;
		};

		resolvers.resolve();
		assert.equal(functionText, 'hello');
		assert.equal(scope, undefined, 'function scope should not be tampered with');
	});

	it('adds the correct display style to the wrapping node based on the root node of the widget', () => {
		register(DisplayElement);
		element = document.createElement('display-element-inline-block');
		document.body.appendChild(element);
		const { display } = global.getComputedStyle(element);
		assert.equal(display, 'inline-block');
	});

	it('adds display:block if no style found on root node of widget', () => {
		register(DisplayElementDefault);
		element = document.createElement('display-element-default-block');
		document.body.appendChild(element);
		const { display } = global.getComputedStyle(element);
		assert.equal(display, 'block');
	});

	it('handles children being appended as document is still loading', () => {
		resolvers.restore();
		register(DelayedChildrenWidget);

		Object.defineProperty(document, 'readyState', {
			configurable: true,
			get() {
				return 'loading';
			}
		});
		element = document.createElement('delayed-children-element');
		document.body.appendChild(element);

		let child = document.createTextNode('foo');
		element!.appendChild(child);

		Object.defineProperty(document, 'readyState', {
			configurable: true,
			get() {
				return 'complete';
			}
		});
		child = document.createTextNode('bar');
		element!.appendChild(child);

		return waitFor(
			() =>
				element!.outerHTML ===
				'<delayed-children-element style="display: block;"><div><div data-key="child-0">foo</div><div data-key="child-1">bar</div></div></delayed-children-element>'
		);
	});

	it('eventually parses an element processed while loading', () => {
		resolvers.restore();

		Object.defineProperty(document, 'readyState', {
			configurable: true,
			get() {
				return 'loading';
			}
		});
		element = document.createElement('foo-element');
		document.body.appendChild(element);

		const nextSibling = document.createElement('div');
		document.body.appendChild(nextSibling);

		assert.notEqual(element.outerHTML, '<foo-element style="display: block;"><div>hello world</div></foo-element>');
		return waitFor(
			() => element!.outerHTML === '<foo-element style="display: block;"><div>hello world</div></foo-element>'
		).finally(() => {
			Object.defineProperty(document, 'readyState', {
				configurable: true,
				get() {
					return 'complete';
				}
			});
		});
	});

	it('uses the property map to create change the name of the focus property', () => {
		@customElement({
			tag: 'widgetA-element',
			properties: ['focus'],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				console.log('A', this.properties, this.children);
				return v('div', {}, [this.properties.focus, ...this.children]);
			}
		}
		@customElement({
			tag: 'widgetB-element',
			properties: ['focus'],
			attributes: [],
			events: []
		})
		class WidgetB extends WidgetBase<any> {
			render() {
				return v('div', {}, this.properties.focus);
			}
		}
		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));
		const ChildCustomElement = create((WidgetB as any).__customElementDescriptor, () => Promise.resolve(WidgetB));

		element = document.createElement('ce-test-focus');
		customElements.define('ce-test-focus', CustomElement);
		customElements.define('ce-test-focus-child', ChildCustomElement);
		const childElement = document.createElement('ce-test-focus-child');
		element.appendChild(childElement);
		document.body.appendChild(element);
		(element as any).set('focus', 'parent focus property');
		resolvers.resolve();
		(childElement as any).set('focus', 'child focus property');
		resolvers.resolve();
		assert.strictEqual(
			'<ce-test-focus style="display: block;"><div>parent focus property<ce-test-focus-child style="display: block;"><div>child focus property</div></ce-test-focus-child></div></ce-test-focus>',
			element.outerHTML
		);
		(childElement as any).set('focus', 'second child focus property');
		console.log(element.outerHTML);
		resolvers.resolve();
		assert.strictEqual(
			'<ce-test-focus style="display: block;"><div>parent focus property<ce-test-focus-child style="display: block;"><div>second child focus property</div></ce-test-focus-child></div></ce-test-focus>',
			element.outerHTML
		);
		console.log(element.outerHTML);
	});

	it('transforms children with slots into a child object', () => {
		@customElement({
			tag: 'parent-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child = this.children[0];

				return v('div', {}, [
					v('div', { classes: ['a-slot'] }, [child && (child as any).a]),
					v('div', { classes: ['b-slot'] }, [child && (child as any).b && (child as any).b()])
				]);
			}
		}

		@customElement({
			tag: 'slot-b-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetB extends WidgetBase<any> {
			render() {
				return 'WidgetB';
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));
		const CustomElementB = create((WidgetB as any).__customElementDescriptor, () => Promise.resolve(WidgetB));

		customElements.define('parent-element', CustomElement);
		customElements.define('slot-b-element', CustomElementB);

		const element = document.createElement('parent-element');

		const slotChild = document.createElement('div');
		slotChild.setAttribute('slot', 'a');
		slotChild.innerHTML = 'test';

		const slotBChild = document.createElement('slot-b-element');
		slotBChild.setAttribute('slot', 'b');

		element.appendChild(slotChild);
		element.appendChild(slotBChild);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<parent-element style="display: block;"><div><div class="a-slot"><div slot="a">test</div></div><div class="b-slot"><slot-b-element slot="b">WidgetB</slot-b-element></div></div></parent-element>'
		);
	});

	it('wraps child nodes in render functions', () => {
		@customElement({
			tag: 'render-func-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, [child && child()]);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('render-func-element', CustomElement);

		const element = document.createElement('render-func-element');

		const slotChild = document.createElement('label');
		slotChild.innerHTML = 'test';

		element.appendChild(slotChild);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<render-func-element style="display: block;"><div><label>test</label></div></render-func-element>'
		);
	});

	it('combines children with the same slot name into an array', () => {
		@customElement({
			tag: 'slot-array-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, child.foo);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('slot-array-element', CustomElement);

		const element = document.createElement('slot-array-element');

		const slotChild1 = document.createElement('label');
		slotChild1.setAttribute('slot', 'foo');
		slotChild1.innerHTML = 'test1';
		const slotChild2 = document.createElement('label');
		slotChild2.setAttribute('slot', 'foo');
		slotChild2.innerHTML = 'test2';

		element.appendChild(slotChild1);
		element.appendChild(slotChild2);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<slot-array-element style="display: block;"><div><label slot="foo">test1</label><label slot="foo">test2</label></div></slot-array-element>'
		);
	});

	it('ignores elements with no slots when at least one element has a slot', () => {
		@customElement({
			tag: 'ignore-slot-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, [child.foo]);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('ignore-slot-element', CustomElement);

		const element = document.createElement('ignore-slot-element');

		const slotChild1 = document.createElement('label');
		slotChild1.setAttribute('slot', 'foo');
		slotChild1.innerHTML = 'test1';
		const slotChild2 = document.createElement('label');
		slotChild2.innerHTML = 'test2';

		element.appendChild(slotChild1);
		element.appendChild(slotChild2);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<ignore-slot-element style="display: inline;"><label>test2</label><div><label slot="foo">test1</label></div></ignore-slot-element>'
		);
	});

	it('dispatches events to dom nodes when child render funcs have arguments', async () => {
		const eventStub = stub();

		@customElement({
			tag: 'dispatch-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, [child.foo(15)]);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('dispatch-element', CustomElement);

		const element = document.createElement('dispatch-element');

		const slotChild1 = document.createElement('label');
		slotChild1.setAttribute('slot', 'foo');
		slotChild1.innerHTML = 'test1';

		slotChild1.addEventListener('render', (event: any) => {
			eventStub(event.detail[0]);
		});

		element.appendChild(slotChild1);
		document.body.appendChild(element);

		// this one to render
		resolvers.resolve();
		// this one to call the event dispatch
		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<dispatch-element style="display: block;"><div><label slot="foo">test1</label></div></dispatch-element>'
		);

		assert.isTrue(eventStub.calledWith(15));
	});

	it('dispatches events to wnodes when child render funcs have arguments', async () => {
		const nodeEventStub = stub();

		@customElement({
			tag: 'dispatch-node-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, [child.foo(15)]);
			}
		}

		@customElement({
			tag: 'dispatch-element-child',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetB extends WidgetBase<any> {
			render() {
				return v('label', {}, ['test']);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));
		const CustomElementChild = create((WidgetB as any).__customElementDescriptor, () => Promise.resolve(WidgetB));

		customElements.define('dispatch-node-element', CustomElement);
		customElements.define('dispatch-element-child', CustomElementChild);

		const element = document.createElement('dispatch-node-element');

		const slotChild = document.createElement('dispatch-element-child');
		slotChild.setAttribute('slot', 'foo');
		slotChild.addEventListener('render', (event: any) => {
			nodeEventStub(event.detail[0]);
		});

		element.appendChild(slotChild);
		document.body.appendChild(element);

		// this one to render
		resolvers.resolve();
		// this one to call the event dispatch
		resolvers.resolve();

		assert.isTrue(nodeEventStub.calledWith(15));
	});

	it('renders dom-only nodes as slots', async () => {
		@customElement({
			tag: 'dom-slots-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, child.foo);
			}
		}

		const CustomElement = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('dom-slots-element', CustomElement);

		const element = document.createElement('dom-slots-element');

		const slotChild1 = document.createElement('label');
		slotChild1.setAttribute('slot', 'foo');
		slotChild1.innerHTML = 'test1';

		const slotChild2 = document.createElement('label');
		slotChild2.setAttribute('slot', 'foo');
		slotChild2.innerHTML = 'test2';

		element.appendChild(slotChild1);
		element.appendChild(slotChild2);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<dom-slots-element style="display: block;"><div><label slot="foo">test1</label><label slot="foo">test2</label></div></dom-slots-element>'
		);
	});

	it('renders children before and after they hydrate', () => {
		@customElement({
			tag: 'late-hydrate-parent-slots-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				const child: any = this.children[0];

				return v('div', {}, [child.foo]);
			}
		}

		@customElement({
			tag: 'late-hydrate-child-slots-element',
			properties: [],
			attributes: [],
			events: []
		})
		class WidgetB extends WidgetBase<any> {
			render() {
				return v('label', {}, ['i am a child']);
			}
		}

		const CustomElementParent = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));
		const CustomElementChild = create((WidgetB as any).__customElementDescriptor, () => Promise.resolve(WidgetB));

		customElements.define('late-hydrate-parent-slots-element', CustomElementParent);

		const element = document.createElement('late-hydrate-parent-slots-element');

		const slotChild1 = document.createElement('late-hydrate-child-slots-element');
		slotChild1.setAttribute('slot', 'foo');

		element.appendChild(slotChild1);
		document.body.appendChild(element);

		resolvers.resolve();

		assert.strictEqual(
			element.outerHTML,
			'<late-hydrate-parent-slots-element style="display: block;"><div><late-hydrate-child-slots-element slot="foo"></late-hydrate-child-slots-element></div></late-hydrate-parent-slots-element>'
		);

		customElements.define('late-hydrate-child-slots-element', CustomElementChild);

		resolvers.resolve();

		const child = element.childNodes[0].childNodes[0] as any;
		assert.isTrue(child.getAttribute('slot') === 'foo');
		assert.isTrue(child.innerHTML === '<label>i am a child</label>');
	});

	it('parses initial properties as attributes', () => {
		@customElement({
			tag: 'attribute-properties-initial',
			properties: ['bar'],
			attributes: ['foo'],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				return v('div', {}, [JSON.stringify(this.properties.foo), JSON.stringify(this.properties.bar)]);
			}
		}

		const CustomElementParent = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('attribute-properties-initial', CustomElementParent);

		const element = document.createElement('attribute-properties-initial');
		element.setAttribute('foo', '[1,2,3]');
		element.setAttribute('bar', '[1,2,3]');

		document.body.appendChild(element);

		resolvers.resolve();

		assert.deepEqual(element.innerHTML, '<div>"[1,2,3]"[1,2,3]</div>');
	});

	it('parses observed property attributes', () => {
		@customElement({
			tag: 'attribute-properties-observed',
			properties: ['bar'],
			attributes: ['foo'],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				return v('div', {}, [
					JSON.stringify(this.properties.foo),
					JSON.stringify(this.properties.bar || false)
				]);
			}
		}

		const CustomElementParent = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('attribute-properties-observed', CustomElementParent);

		const element = document.createElement('attribute-properties-observed');
		element.setAttribute('foo', '[1,2,3]');

		document.body.appendChild(element);

		resolvers.resolve();

		assert.deepEqual(element.innerHTML, '<div>"[1,2,3]"false</div>');

		element.setAttribute('bar', '[1,2,3]');
		resolvers.resolve();

		assert.deepEqual(element.innerHTML, '<div>"[1,2,3]"[1,2,3]</div>');
	});

	it('ignores improper json in property parsing', () => {
		@customElement({
			tag: 'attribute-properties-invalid',
			properties: ['bar'],
			events: []
		})
		class WidgetA extends WidgetBase<any> {
			render() {
				return v('div', {}, [JSON.stringify(this.properties.bar || false)]);
			}
		}

		const CustomElementParent = create((WidgetA as any).__customElementDescriptor, () => Promise.resolve(WidgetA));

		customElements.define('attribute-properties-invalid', CustomElementParent);

		const element = document.createElement('attribute-properties-invalid');
		element.setAttribute('bar', 'invalid');

		document.body.appendChild(element);

		resolvers.resolve();

		assert.deepEqual(element.innerHTML, '<div>false</div>');

		element.setAttribute('bar', '[1,2,3');
		resolvers.resolve();

		assert.deepEqual(element.innerHTML, '<div>false</div>');
	});
});
