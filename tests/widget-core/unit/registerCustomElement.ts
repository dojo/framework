import global from '@dojo/shim/global';
import { reference } from '../../src/diff';
import diffProperty from '../../src/decorators/diffProperty';
import customElement from '../../src/decorators/customElement';
import WidgetBase from '../../src/WidgetBase';
import Container from '../../src/Container';
import Injector from '../../src/Injector';
import Registry from '../../src/Registry';
import { v, w } from '../../src/d';
import register, { create, CustomElementChildType } from '../../src/registerCustomElement';
import { createResolvers } from './../support/util';
import { ThemedMixin, theme } from '../../src/mixins/Themed';

const { describe, it, beforeEach, afterEach, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

@customElement({
	tag: 'foo-element'
})
class Foo extends WidgetBase {
	render() {
		return v('div', ['hello world']);
	}
}

function createTestWidget(options: any) {
	const { properties, attributes, events, childType = CustomElementChildType.DOJO } = options;
	@customElement<any>({
		tag: 'bar-element',
		properties,
		attributes,
		events,
		childType
	})
	@diffProperty('myExternalFunction', reference)
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
			const { myProp = '', myAttr = '', myExternalFunction } = this.properties;
			if (myExternalFunction) {
				myExternalFunction('hello');
			}
			return v('div', [
				v('button', { classes: ['event'], onclick: this._onClick }),
				v('div', { classes: ['prop'] }, [`${myProp}`]),
				v('div', { classes: ['attr'] }, [`${myAttr}`]),
				v('div', { classes: ['handler'] }, [`${this._called}`]),
				v('div', { classes: ['childProp'] }, [`${childProp}`]),
				v('div', { classes: ['children'] }, this.children)
			]);
		}
	}
	return Bar;
}

@customElement({ tag: 'themed-element' })
@theme({ ' _key': 'themedWidget', foo: 'bar' })
class ThemedWidget extends ThemedMixin(WidgetBase) {
	render() {
		return v('div', { classes: ['root'] }, [this.theme('bar')]);
	}
}

describe('registerCustomElement', () => {
	let element: Element | undefined;
	const resolvers = createResolvers();

	before((suite) => {
		try {
			const Test = createTestWidget({});
			const CustomElement = create((Test.prototype as any).__customElementDescriptor, Test);
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
		assert.equal(element.outerHTML, '<foo-element><div>hello world</div></foo-element>');
	});

	it('custom element with property', () => {
		const Bar = createTestWidget({ properties: ['myProp'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-1', CustomElement);
		element = document.createElement('bar-element-1');
		(element as any).myProp = 'hello';
		document.body.appendChild(element);
		const prop = element.querySelector('.prop') as HTMLElement;
		assert.equal(prop.innerHTML, 'hello');
	});

	it('custom element with attribute', () => {
		const Bar = createTestWidget({ attributes: ['myAttr'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
		customElements.define('bar-element-2', CustomElement);
		element = document.createElement('bar-element-2');
		element.setAttribute('myAttr', 'world');
		document.body.appendChild(element);
		const attr = element.querySelector('.attr') as HTMLElement;
		assert.equal(attr.innerHTML, 'world');
	});

	it('custom element with event', () => {
		let called = false;
		const Bar = createTestWidget({ events: ['onBar'] });
		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
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
		const BarA = createTestWidget({});
		const CustomElementA = create((BarA.prototype as any).__customElementDescriptor, BarA);
		customElements.define('bar-a', CustomElementA);
		const BarB = createTestWidget({ attributes: ['myAttr'], properties: ['myProp'], events: ['onBar'] });
		const CustomElementB = create((BarB.prototype as any).__customElementDescriptor, BarB);
		customElements.define('bar-b', CustomElementB);
		element = document.createElement('bar-a');
		const barB = document.createElement('bar-b');
		let childRenderCounter = 0;
		element.addEventListener('dojo-ce-render', () => {
			childRenderCounter++;
		});
		element.appendChild(barB);
		document.body.appendChild(element);
		(barB as any).myProp = 'set property on child';
		resolvers.resolve();

		assert.strictEqual(2, childRenderCounter);

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
		const CustomElementA = create((BazA.prototype as any).__customElementDescriptor, BazA);
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
		const CustomElementA = create((QuxA.prototype as any).__customElementDescriptor, QuxA);
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

	it('custom element with global theme', () => {
		const CustomElement = create((ThemedWidget.prototype as any).__customElementDescriptor, ThemedWidget);
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
		const injector = new Injector({ text: 'foo' });
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

		const CustomElement = create((Bar.prototype as any).__customElementDescriptor, Bar);
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
		const Widget = createTestWidget({ properties: ['myExternalFunction'] });
		const CustomElement = create((Widget.prototype as any).__customElementDescriptor, Widget);
		customElements.define('function-property-element', CustomElement);
		element = document.createElement('function-property-element');
		document.body.appendChild(element);

		let functionText = '';
		let scope: any;

		(element as any).myExternalFunction = function(text: string) {
			functionText = text;
			scope = this;
		};

		resolvers.resolve();
		assert.equal(functionText, 'hello');
		assert.equal(scope, undefined, 'function scope should not be tampered with');
	});
});
