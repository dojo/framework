import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import harness, { assignChildProperties, assignProperties, replaceChild, replaceChildProperties, replaceProperties } from '../../src/harness';

import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import assertRender from '../../src/support/assertRender';

const hasFunctionName = (() => {
	function foo() {}
	return (<any> foo).name === 'foo';
})();

interface MockWidgetProperties extends WidgetProperties {
	foo?: string;
	bar?: number;
	baz?: (e: Event) => void;
}

class MockWidget<P extends MockWidgetProperties> extends WidgetBase<P> {
	render() {
		return v('div.foo');
	}
}

class SubWidget extends WidgetBase<WidgetProperties> {
	render() {
		return v('div', { }, [ w(MockWidget, { bind: this, key: 'first' }), w('widget', { bind: this, key: 'second' }) ]);
	}
}

registerSuite({
	name: 'harness',

	'rendering': {
		'nodes are added during rendering and removed after destruction'() {
			const widget = harness(MockWidget);
			const bodyChildCount = document.body.childElementCount;
			const dom = widget.getDom();
			assert.strictEqual(document.body.childElementCount, bodyChildCount + 1, 'body should have an extra node');
			const parentElement = dom.parentElement!;
			assert.strictEqual(parentElement.tagName, 'TEST--HARNESS');
			assert.include(parentElement.getAttribute('id')!, 'test--harness-');
			assert.strictEqual(parentElement.childElementCount, 1, 'harness should only have one child element');
			assert.strictEqual(parentElement.parentElement, document.body, 'harness root should be child of document.body');
			widget.destroy();
			assert.strictEqual(document.body.childElementCount, bodyChildCount, 'body should have had a child removed');
			assert.isNull(parentElement.parentElement, 'harness root should no longer be a child of the document.body');
		},

		'WNodes are stubbed'() {
			const widget = harness(SubWidget);
			const dom = widget.getDom();
			assert.strictEqual(dom.tagName, 'DIV');
			assert.strictEqual(dom.childElementCount, 2);
			assert.strictEqual(dom.children[0].tagName, 'TEST--WIDGET-STUB');
			assert.strictEqual(dom.children[1].tagName, 'TEST--WIDGET-STUB');
			if (hasFunctionName) {
				assert.strictEqual(dom.children[0].getAttribute('data--widget-name'), 'MockWidget');
			}
			else {
				assert.strictEqual(dom.children[0].getAttribute('data--widget-name'), '<Anonymous>');
			}
			assert.strictEqual(dom.children[1].getAttribute('data--widget-name'), 'widget');
			widget.destroy();
		},

		'support custom event listeners on rendering'() {
			let called = false;

			class CustomEventWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', { onfoo() { called = true; }});
				}
			}

			const widget = harness(CustomEventWidget);
			assert.isFalse(called, 'should not have been called yet');
			widget.sendEvent('foo');
			assert.isTrue(called, 'the custom event listener should have been called');
			widget.destroy();
		},

		'binds properly'() {
			let clickCalled = false;
			let fooCalled = false;

			class MisboundWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', {
						bind: undefined,
						onclick(this: any) {
							clickCalled = true;
							assert(this);
						},

						onfoo(this: any) {
							fooCalled = true;
							assert(this);
						}
					});
				}
			}

			const widget = harness(MisboundWidget);
			widget.sendEvent('click');
			assert.isTrue(clickCalled, '"click" event listener should have been called');
			widget.sendEvent('foo');
			assert.isTrue(fooCalled, '"foo" event listener should have been called');
			widget.destroy();
		},

		'harness can have a different root'() {
			const div = document.createElement('div');
			document.body.appendChild(div);

			const widget = harness(MockWidget, div);
			const parentElement = widget.getDom().parentElement!;
			assert.strictEqual(parentElement.parentElement, div, 'the root of the harness should be a child of the div');
			widget.destroy();
			assert.isNull(parentElement.parentElement, 'should be removed from div');
			assert.isNull(div.firstChild, 'should not have a child anymore');
			document.body.removeChild(div); /* cleanup after test */
		},

		'bad render throws'() {
			class NullWidget extends WidgetBase<WidgetProperties> {
				render () {
					return null;
				}
			}

			const widget = harness(NullWidget);

			assert.throws(() => {
				widget.getDom();
			}, Error, 'No root node has been rendered');

			widget.destroy();
		}
	},

	'.expectRender()': {
		'HNode render - matches'() {
			const widget = harness(MockWidget);
			widget.expectRender(v('div.foo'));
			widget.destroy();
		},

		'HNode render - does not match'() {
			const widget = harness(MockWidget);
			assert.throws(() => {
				widget.expectRender(v('div.bar'));
			});
			widget.destroy();
		},

		'WNode children render - matches'() {
			const widget = harness(SubWidget);
			widget.expectRender(v('div', { }, [ w(MockWidget, { bind: true, key: 'first' }), w('widget', { bind: true, key: 'second' }) ]));
			widget.destroy();
		},

		'WNode children render - does not match'() {
			const widget = harness(SubWidget);
			assert.throws(() => {
				widget.expectRender(v('div', { }, [ w(MockWidget, { key: 'first' }), w('widget', { bind: true, key: 'second' }) ]));
			});
			widget.destroy();
		},

		'render does not occur'() {
			class BrokenRender {
				addDecorator() { }
				setProperties() { }
				on() { }
				own() { }
				setChildren() { }
				__render__() { }
			}

			const widget = harness(<any> BrokenRender);
			assert.throws(() => {
				widget.expectRender(null);
			}, Error, 'An expected render did not occur.');
			widget.destroy();
		}
	},

	'.classes()': {
		'are additive'() {
			const widget = harness(MockWidget);

			assert.deepEqual(widget.classes('foo', 'bar'), {
				foo: true,
				bar: true
			});

			assert.deepEqual(widget.classes('baz', 'bar'), {
				foo: false,
				baz: true,
				bar: true
			});

			widget.destroy();
		},

		'handles null values'() {
			const widget = harness(MockWidget);

			assert.deepEqual(widget.classes('baz', null, 'bar'), {
				baz: true,
				bar: true
			});

			widget.destroy();
		}
	},

	'.resetClasses()'() {
		const widget = harness(MockWidget);

		assert.deepEqual(widget.classes('foo', 'bar'), {
			foo: true,
			bar: true
		});

		widget.resetClasses();

		assert.deepEqual(widget.classes('baz', 'bar'), {
			baz: true,
			bar: true
		});

		widget.destroy();
	},

	'.setChildren()': {
		'set children are in render'() {
			class ParentWidget extends WidgetBase<WidgetProperties> {
				render () {
					return v('div', {}, this.children);
				}
			}

			const widget = harness(ParentWidget);

			widget.setChildren([ v('span'), v('a', { href: 'http://dojo.io' }) ]);

			widget.expectRender(v('div', {}, [
				v('span'),
				v('a', { href: 'http://dojo.io' })
			]));

			widget.destroy();
		}
	},

	'.setProperties()': {
		'properties alter render'() {
			interface DynamicWidgetProperties extends WidgetProperties {
				flag: boolean;
			}

			class DynamicWidget extends WidgetBase<DynamicWidgetProperties> {
				render() {
					return this.properties.flag ?
						v('div', { }, [ w(MockWidget, { bind: this, key: 'first' }), w(MockWidget, { bind: this, key: 'second' }) ]) :
						v('div', { }, [ w(MockWidget, { bind: this, key: 'first' }) ]);
				}
			}

			const widget = harness(DynamicWidget);

			widget.setProperties({ flag: false });
			widget.expectRender(v('div', { }, [ w(MockWidget, { bind: true, key: 'first' }) ]));

			widget.setProperties({ flag: true });
			widget.expectRender(v('div', { }, [ w(MockWidget, { bind: true, key: 'first' }), w(MockWidget, { bind: true, key: 'second' }) ]));

			widget.destroy();
		}
	},

	'.sendEvent()': {
		'default sendEvent'() {
			let clickCount = 0;
			let dom: HTMLElement;

			class ButtonWidget extends WidgetBase<WidgetProperties> {
				private _tag = 'foo';

				protected onClick(e: MouseEvent): boolean {
					clickCount++;
					e.preventDefault();
					if ('CustomEvent' in window) {
						assert.instanceOf(e, window['CustomEvent'], 'should be of class custom event');
					}
					assert.strictEqual(e.type, 'click', 'should be type of "click"');
					assert.strictEqual(e.target, dom, 'the target should be the rendered dom');
					assert.strictEqual(this._tag, 'foo', '"this" should be an instance of the class');
					return true;
				}

				render() {
					return v('button', { onclick: this.onClick });
				}
			}

			const widget = harness(ButtonWidget);

			assert.strictEqual(clickCount, 0);

			dom = widget.getDom();

			widget.sendEvent('click');

			assert.strictEqual(clickCount, 1);

			widget.destroy();
		},

		'with target'() {
			let clickCount = 0;
			let target: any;

			class ButtonWidget extends WidgetBase<WidgetProperties> {
				private _tag = 'foo';

				protected onClick(e: MouseEvent): boolean {
					clickCount++;
					e.preventDefault();
					if ('CustomEvent' in window) {
						assert.instanceOf(e, window['CustomEvent'], 'should be of class custom event');
					}
					assert.strictEqual(e.type, 'click', 'should be type of "click"');
					assert.strictEqual(e.target, target, 'the target should be the rendered dom firstchild');
					assert.strictEqual(this._tag, 'foo', '"this" should be an instance of the class');
					return true;
				}

				render() {
					return v('div', { onclick: this.onClick }, [ v('button') ]);
				}
			}

			const widget = harness(ButtonWidget);

			assert.strictEqual(clickCount, 0);

			target = widget.getDom().firstChild;

			widget.sendEvent('click', {
				target
			});

			assert.strictEqual(clickCount, 1);

			widget.destroy();
		}
	},

	'.getDom()'() {
		const widget = harness(MockWidget);
		const dom = widget.getDom();
		assert.strictEqual(dom.parentElement && dom.parentElement.innerHTML, '<div class="foo"></div>', 'widget was rendered to the DOM as expected');
		widget.destroy();
	},

	'.getRender()'() {
		const widget = harness(MockWidget);
		assertRender(widget.getRender(), v('div.foo'));
		widget.destroy();
	},

	'.destroy()': {
		'handles premature removal from the dom'() {
			const widget = harness(MockWidget);
			const dom = widget.getDom();
			dom.parentElement && dom.parentElement.parentElement && dom.parentElement.parentElement.removeChild(dom.parentElement);
			widget.destroy();
		},

		'double destroy does not cause issues'() {
			const widget = harness(MockWidget);
			widget.getDom();
			widget.destroy();
			widget.destroy();
		}
	},

	'.listener': {
		'listener stub is present and returns true'() {
			const widget = harness(MockWidget);
			assert.isFunction(widget.listener, 'listener should be a function');
			assert.isTrue(widget.listener(), 'listener should return `true`');
			widget.destroy();
		}
	},

	'assignChildProperties()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			assignChildProperties(actual, 1, { target: '_blank' });

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link', target: '_blank' }) ]));
		},

		'does not resolve'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assert.throws(() => {
				assignChildProperties(actual, 0, { target: '_blank' });
			}, TypeError, 'Index of "0" is not resolving to a valid target');
		}
	},

	'assignProperties()': {
		'basic'() {
			const actual = v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]));

			assignProperties(actual, { styles: { 'font-weight': 'bold' } });

			assertRender(actual, v('div', { styles: { 'font-weight': 'bold' } }, [ null, v('a', { href: '#link' }) ]));
		}
	},

	'replaceChild()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChild(actual, 0, v('dfn'));

			assertRender(actual, v('div', {}, [ v('dfn'), v('a', { href: '#link' }) ]));
		},

		'by string index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChild(actual, '0', v('dfn'));

			assertRender(actual, v('div', {}, [ v('dfn'), v('a', { href: '#link' }) ]));
		},

		'no children'() {
			const actual = w('widget', {});

			assertRender(actual, w('widget', {}));

			replaceChild(actual, 0, v('span'));

			assertRender(actual, w('widget', {}, [ v('span') ]));
		},

		'by string deep index'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]));

			replaceChild(actual, '0,0', 'baz');

			assertRender(actual, v('div', {}, [ v('span', {}, [ 'baz' ]), v('a', { href: '#link' }) ]));
		},

		'final item missing children'() {
			const actual = v('div', [ v('span', [ w('widget', { }) ]) ]);

			assertRender(actual, v('div', [ v('span', [ w('widget', { }) ]) ]));

			replaceChild(actual, '0,0,0', 'foo');

			assertRender(actual, v('div', [ v('span', [ w('widget', { }, [ 'foo' ]) ]) ]));
		},

		'string index resolving to a non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				replaceChild(actual, '0,0,0', 'bar');
			}, TypeError, 'Index of "0,0,0" is not resolving to a valid target');
		},

		'string index resolve to an earlier non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				replaceChild(actual, '3,0,0', 'bar');
			}, TypeError, 'Index of "3,0,0" is not resolving to a valid target');
		}
	},

	'replaceChildProperties()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChildProperties(actual, 1, { target: '_blank' });

			assertRender(actual, v('div', {}, [ null, v('a', { target: '_blank' }) ]));
		},

		'throws when final child can\'t have properties'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			assert.throws(() => {
				replaceChildProperties(actual, 0, { target: '_blank' });
			}, TypeError, 'Index of "0" is not resolving to a valid target');
		}
	},

	'replaceProperties()': {
		'basic'() {
			const actual = v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]));

			replaceProperties(actual, { classes: { 'foo': true } });

			assertRender(actual, v('div', { classes: { 'foo': true } }, [ null, v('a', { href: '#link' }) ]));
		}
	},

	'non-exported resolveChild()': {
		'by string index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			assignChildProperties(actual, '1', { target: '_blank' });

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link', target: '_blank' }) ]));
		},

		'no children throws'() {
			const actual = w('widget', {});

			assertRender(actual, w('widget', {}));

			assert.throws(() => {
				assignChildProperties(actual, 0, { foo: 'bar' });
			}, TypeError, 'Index of "0" is not resolving to a valid target');
		},

		'by string deep index'() {
			const actual = v('div', {}, [ v('span', {}, [ v('a', { href: '#link' }) ]) ]);

			assertRender(actual, v('div', {}, [ v('span', {}, [ v('a', { href: '#link' }) ]) ]));

			assignChildProperties(actual, '0,0', { target: '_blank' });

			assertRender(actual, v('div', {}, [ v('span', {}, [ v('a', { href: '#link', target: '_blank' }) ]) ]));
		},

		'final item missing children throws'() {
			const actual = v('div', [ v('span', [ w('widget', { }) ]) ]);

			assertRender(actual, v('div', [ v('span', [ w('widget', { }) ]) ]));

			assert.throws(() => {
				assignChildProperties(actual, '0,0,0', { foo: 'bar' });
			}, TypeError, 'Index of "0,0,0" is not resolving to a valid target');
		},

		'string index resolving to a non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				assignChildProperties(actual, '0,0,0', { foo: 'bar' });
			}, TypeError, 'Index of "0,0,0" is not resolving to a valid target');
		},

		'string index resolve to an earlier non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				assignChildProperties(actual, '3,0,0', { foo: 'bar' });
			}, TypeError, 'Index of "3,0,0" is not resolving to a valid target');
		}
	}
});
