const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import harness, { MetaMockContext } from '../../src/harness';
import { compareProperty } from '../../src/support/d';

import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { stub } from 'sinon';
import NodeId from '../support/NodeId';
import AssertionError from '../../src/support/AssertionError';
import assertRender from '../../src/support/assertRender';

const hasFunctionName = (() => {
	function foo() {}
	return (<any> foo).name === 'foo';
})();

interface MockWidgetProperties extends WidgetProperties {
	foo?: string;
	bar?: number;
	baz?: (e: Event) => void;
	onClick?: () => void;
}

class MockWidget extends WidgetBase<MockWidgetProperties> {
	render() {
		return v('div', { classes: [ 'foo' ] });
	}
}

class MockArrayWidget extends WidgetBase<MockWidgetProperties> {
	render() {
		return [
			v('div', { classes: [ 'foo' ] })
		];
	}
}

class MockRegistry {
	tag: string;
}

interface RegistryWidgetProperties extends WidgetProperties {
	registry: MockRegistry;
}

class RegistryWidgetChild extends WidgetBase<RegistryWidgetProperties> {
	render() {
		return v('span');
	}
}

class RegisterChildWidget extends WidgetBase<WidgetProperties & { tag: string; }> {
	render() {
		const registry = new MockRegistry();
		registry.tag = this.properties.tag;
		return v('div', {
			key: 'wrapper'
		}, [ w(RegistryWidgetChild, {
			key: 'child',
			registry
		}) ]);
	}
}

class SubWidget extends WidgetBase<WidgetProperties> {
	render() {
		return v('div', { }, [ w(MockWidget, { key: 'first' }), w('widget', { key: 'second' }) ]);
	}
}

registerSuite('harness', {

	'rendering': {
		'nodes are added during rendering'() {
			const widget = harness(MockWidget);
			const dom = widget.getDom();
			const parentElement = dom.parentElement!;
			assert.strictEqual(parentElement.tagName, 'TEST--HARNESS');
			assert.include(parentElement.getAttribute('id')!, 'test--harness-');
			assert.strictEqual(parentElement.childElementCount, 1, 'harness should only have one child element');
			widget.destroy();
		},

		'harness can have a different root'() {
			const div = document.createElement('div');
			document.body.appendChild(div);

			const widget = harness(MockWidget, div);
			const parentElement = widget.getDom().parentElement!;
			assert.strictEqual(parentElement.parentElement, div, 'the root of the harness should be a child of the div');
			widget.destroy();
			document.body.removeChild(div); /* cleanup after test */
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

		'bad render throws'() {
			class NullWidget extends WidgetBase<WidgetProperties> {
				render() {
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
			widget.expectRender(v('div', { classes: [ 'foo' ] }));
			widget.destroy();
		},

		'HNode render array - matches'() {
			const widget = harness(MockArrayWidget);
			widget.expectRender([ v('div', { classes: [ 'foo' ] }) ]);
			widget.destroy();
		},

		'HNode render null - matches'() {
			class MockWidget extends WidgetBase {
				render() {
					return null;
				}
			}
			const widget = harness(MockWidget);
			widget.expectRender(null);
			widget.destroy();
		},

		'HNode render string - matches'() {
			class MockWidget extends WidgetBase {
				render() {
					return 'string';
				}
			}
			const widget = harness(MockWidget);
			widget.expectRender('string');
			widget.destroy();
		},

		'HNode render - does not match'() {
			const widget = harness(MockWidget);
			assert.throws(() => {
				widget.expectRender(v('div', { classes: [ 'bar' ] }));
			});
			widget.destroy();
		},

		'HNode render array - does not match'() {
			const widget = harness(MockWidget);
			assert.throws(() => {
				widget.expectRender([ v('div', { classes: [ 'baz' ] }) ]);
			});
			widget.destroy();
		},

		'HNode render null - does not matches'() {
			class MockWidget extends WidgetBase {
				render() {
					return null;
				}
			}
			const widget = harness(MockWidget);
			assert.throws(() => {
				widget.expectRender([ v('div', { classes: [ 'baz' ] }) ]);
			});
			widget.destroy();
		},

		'HNode render string - does not matches'() {
			class MockWidget extends WidgetBase {
				render() {
					return 'string';
				}
			}
			const widget = harness(MockWidget);
			assert.throws(() => {
				widget.expectRender([ v('div', { classes: [ 'baz' ] }) ]);
			});
			widget.destroy();
		},

		'WNode children render - matches'() {
			const widget = harness(SubWidget);
			widget.expectRender(v('div', { }, [ w(MockWidget, { key: 'first' }), w('widget', { key: 'second' }) ]));
			widget.destroy();
		},

		'WNode children render - does not match'() {
			const widget = harness(SubWidget);
			assert.throws(() => {
				widget.expectRender(v('div', { }, [ w(MockWidget, { key: 'fist' }), w('widget', { key: 'second' }) ]));
			});
			widget.destroy();
		},

		'render does not occur'() {
			class BrokenRender {
				addDecorator() { }
				__setProperties__() { }
				on() { }
				own() { }
				__setChildren__() { }
				__render__() { }
			}

			const widget = harness(BrokenRender as any);
			assert.throws(() => {
				widget.expectRender(null);
			}, Error, 'An expected render did not occur.');
			widget.destroy();
		},

		'self invalidation does not break render'() {
			let called = false;
			class SelfInvalidateWidget extends WidgetBase {
				onClick = () => {
					called = true;
					this.invalidate();
				}

				render() {
					return v('div', {
						onClick: this.onClick
					});
				}
			}

			const widget = harness(SelfInvalidateWidget);
			widget.callListener('onClick');
			assert.isTrue(called);
			widget.expectRender(v('div', {
				onClick: widget.listener
			}));
		},

		'with comparison': {
			'widget render - properties match'() {
				const widget = harness(RegisterChildWidget);
				widget.setProperties({
					tag: 'foo'
				});
				let called = false;
				const compareRegistry = compareProperty((value: MockRegistry, name, properties: RegistryWidgetProperties) => {
					called = true;
					assert.instanceOf(value, MockRegistry);
					assert.strictEqual(name, 'registry');
					assert.strictEqual(properties.key, 'child');
					return value.tag === 'foo';
				});
				widget.expectRender(v('div', { key: 'wrapper' }, [
					w<any>(RegistryWidgetChild, { key: 'child', registry: compareRegistry })
				]));
				assert.isTrue(called, 'comparer should have been called');
			},

			'widget render - properties do not match'() {
				const widget = harness(RegisterChildWidget);
				widget.setProperties({
					tag: 'bar'
				});
				let called = false;
				const compareRegistry = compareProperty((value: MockRegistry) => {
					called = true;
					return value.tag === 'foo';
				});
				assert.throws(() => {
					widget.expectRender(v('div', { key: 'wrapper' }, [
						w<any>(RegistryWidgetChild, { key: 'child', registry: compareRegistry })
					]));
				}, AssertionError, 'The value of property "registry" is unexpected.');
				assert.isTrue(called, 'comparer should have been called');
			},

			'widget render - primative value compare'() {
				let uuid = 0;
				class IDWidget extends WidgetBase<WidgetProperties> {
					private _id = '_id' + ++uuid;

					render() {
						return v('div', { id: this._id });
					}
				}
				const widget = harness(IDWidget);
				let called = false;
				const compareId = compareProperty((value: string) => {
					called = true;
					return value === `_id${uuid}`;
				});
				widget.expectRender(v('div', { id: compareId as any }));
				assert.isTrue(called, 'comparer should have been called');
			}
		}
	},

	'.setChildren()': {
		'set children are in render'() {
			class ParentWidget extends WidgetBase<WidgetProperties> {
				render() {
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
						v('div', { }, [ w(MockWidget, { key: 'first' }), w(MockWidget, { key: 'second' }) ]) :
						v('div', { }, [ w(MockWidget, { key: 'first' }) ]);
				}
			}

			const widget = harness(DynamicWidget);

			widget.setProperties({ flag: false });
			widget.expectRender(v('div', { }, [ w(MockWidget, { key: 'first' }) ]));

			widget.setProperties({ flag: true });
			widget.expectRender(v('div', { }, [ w(MockWidget, { key: 'first' }), w(MockWidget, { key: 'second' }) ]));

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
						assert(e instanceof window['CustomEvent'], 'should be of class custom event');
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
						assert(e instanceof window['CustomEvent'], 'should be of class custom event');
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
		},

		'with key'() {
			let clickCount = 0;
			let target: any;

			class ButtonWidget extends WidgetBase<WidgetProperties> {
				private _tag = 'foo';

				protected onClick(e: MouseEvent): boolean {
					clickCount++;
					e.preventDefault();
					if ('CustomEvent' in window) {
						assert(e instanceof window['CustomEvent'], 'should be of class custom event');
					}
					assert.strictEqual(e.type, 'click', 'should be type of "click"');
					assert.strictEqual(e.target, target, 'the target should be the rendered dom firstchild');
					assert.strictEqual(this._tag, 'foo', '"this" should be an instance of the class');
					return true;
				}

				render() {
					return v('div', { key: 'wrap', onclick: this.onClick }, [ v('button', { key: 'button' }) ]);
				}
			}

			const widget = harness(ButtonWidget);

			assert.strictEqual(clickCount, 0);

			target = widget.getDom().firstChild;

			widget.sendEvent('click', {
				key: 'button'
			});

			assert.strictEqual(clickCount, 1);

			widget.destroy();
		},

		'with key not found'() {
			class ButtonWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', { key: 'wrap' }, [ v('button', { key: 'button' }), 'foo', 'bar' ]);
				}
			}

			const widget = harness(ButtonWidget);

			assert.throws(() => {
				widget.sendEvent('click', {
					key: 'foo'
				});
			}, Error, 'Could not find key of "foo" to sendEvent');

			widget.destroy();
		},

		'with duplicate key'() {
			class DuplicateKeyWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', { key: 'foo' }, [
						'foo',
						v('span', { key: 'parent1' }, [
							v('i', { key: 'icon', id: 'i1' }, [ 'bar' ]),
							'bar'
						]),
						v('span', { key: 'parent2' }, [
							v('i', { key: 'super-icon', id: 'i1' }, [ 'bar' ]),
							'bar'
						]),
						v('span', { key: 'parent3' }, [
							v('i', { key: 'icon', id: 'i2' }, [ 'bar' ])
						])
					]);
				}
			}

			const warnStub = stub(console, 'warn');

			const widget = harness(DuplicateKeyWidget);
			widget.sendEvent('click', {
				key: 'icon'
			});
			assert.strictEqual(warnStub.callCount, 1, 'should have been called once');
			assert.strictEqual(warnStub.lastCall.args[0], 'Duplicate key of "icon" found.', 'should have logged duplicate key');

			warnStub.restore();
		},

		'text only widget'() {
			/* this is done for full code coverage */
			class TextOnlyWidget extends WidgetBase<WidgetProperties> {
				render() {
					return 'text';
				}
			}

			const widget = harness(TextOnlyWidget);

			assert.throws(() => {
				widget.sendEvent('click', {
					key: 'foo'
				});
			}, Error, 'No root node has been rendered');

			widget.destroy();
		}
	},

	'.callListener()': {
		'defaults'() {
			let rootClick = 0;
			let firstClick = 0;
			let secondClick = 0;
			class ComplexSubWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', {
						onclick() {
							rootClick++;
						}
					}, [
						w(MockWidget, { onClick() { firstClick++; }, key: 'first' }),
						w<MockWidget>('widget', { onClick() { secondClick++; }, key: 'second' })
					]);
				}
			}

			const widget = harness(ComplexSubWidget);
			widget.callListener('onclick');
			assert.strictEqual(rootClick, 1);
			assert.strictEqual(firstClick, 0);
			assert.strictEqual(secondClick, 0);
		},

		'by key'() {
			let rootClick = 0;
			let firstClick = 0;
			let secondClick = 0;
			class ComplexSubWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', {
						onclick() {
							rootClick++;
						}
					}, [
						w(MockWidget, { onClick() { firstClick++; }, key: 'first' }),
						w<MockWidget>('widget', { onClick() { secondClick++; }, key: 'second' })
					]);
				}
			}

			const widget = harness(ComplexSubWidget);
			widget.callListener('onClick', { key: 'first' });
			assert.strictEqual(rootClick, 0);
			assert.strictEqual(firstClick, 1);
			assert.strictEqual(secondClick, 0);
		},

		'by index'() {
			let rootClick = 0;
			let firstClick = 0;
			let secondClick = 0;
			class ComplexSubWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', {
						onclick() {
							rootClick++;
						}
					}, [
						w(MockWidget, { onClick() { firstClick++; }, key: 'first' }),
						w<MockWidget>('widget', { onClick() { secondClick++; }, key: 'second' })
					]);
				}
			}

			const widget = harness(ComplexSubWidget);
			widget.callListener('onClick', { index: 1 });
			assert.strictEqual(rootClick, 0);
			assert.strictEqual(firstClick, 0);
			assert.strictEqual(secondClick, 1);
		},

		'properties.bind'() {
			class ComplexSubWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', { }, [
						w(MockWidget, { onClick(this: any) {
							assert.instanceOf(this, ComplexSubWidget, 'should call with bound scope');
						}, key: 'first' })
					]);
				}
			}

			const widget = harness(ComplexSubWidget);
			widget.callListener('onClick', { key: 'first' });
		},

		'with args'() {
			const event = {};
			class BasicWidget extends WidgetBase<WidgetProperties> {
				render() {
					return v('div', {
						onclick(e) {
							assert.strictEqual(e, event);
						}
					});
				}
			}

			const widget = harness(BasicWidget);
			widget.callListener('onclick', {
				args: [ event ]
			});
		},

		'widget renders string'() {
			class StringWidget extends WidgetBase<WidgetProperties> {
				render() {
					return 'foo';
				}
			}

			const widget = harness(StringWidget);
			assert.throws(() => {
				widget.callListener('onclick');
			}, TypeError, 'Widget is not rendering an HNode or WNode');
		},

		'widget renders null'() {
			class NullWidget extends WidgetBase<WidgetProperties> {
				render() {
					return null;
				}
			}

			const widget = harness(NullWidget);
			assert.throws(() => {
				widget.callListener('onclick');
			}, TypeError, 'Widget is not rendering an HNode or WNode');
		}
	},

	'.getDom()'() {
		const widget = harness(MockWidget);
		const dom = widget.getDom();
		assert.strictEqual(dom.parentElement && dom.parentElement.innerHTML, '<div class="foo"></div>', 'widget was rendered to the DOM as expected');
		widget.destroy();
	},

	'.getRender()'() {
		class ChildTextWidget extends WidgetBase {
			render() {
				return v('div', {}, [ 'foo' ]);
			}
		}
		const widget = harness(ChildTextWidget);
		assertRender(widget.getRender(), v('div', {}, [ 'foo' ]));
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

	'mocking meta': {
		'mocking meta provides mock values'() {
			const idStack: (string | undefined)[] = [];

			class IdWidget extends WidgetBase {
				render() {
					idStack.push(this.meta(NodeId).get('foo'));
					return v('div', {
						key: 'foo',
						id: 'foo'
					}, [ 'Hello world' ]);
				}
			}

			const widget = harness(IdWidget);

			widget.getRender();

			assert.deepEqual(idStack, [ undefined, 'foo' ]);

			const handle = widget.mockMeta(NodeId, {
				get(key: string | number) {
					return 'qat';
				}
			});

			widget.setProperties({
				key: 'foo'
			});

			widget.getRender();

			assert.deepEqual(idStack, [ undefined, 'foo', 'qat' ]);

			handle.destroy();
			widget.setProperties({
				key: 'bar'
			});

			widget.getRender();

			assert.deepEqual(idStack, [ undefined, 'foo', 'qat', undefined ]);

			widget.destroy();
		},

		'mocked meta can invalidate widget'() {
			class IdWidget extends WidgetBase<{ flush: boolean }> {
				render() {
					const content = this.meta(NodeId).get('foo');
					return v('div', {
						key: 'foo',
						id: 'foo'
					}, [ content ? content : 'foo' ]);
				}
			}

			const widget = harness(IdWidget);

			widget.expectRender(v('div', {
				key: 'foo',
				id: 'foo'
			}, [ 'foo' ]));

			widget.mockMeta(NodeId, {
				get(this: MetaMockContext<NodeId>, key: string | number) {
					this.invalidate();
					return 'qat';
				}
			});

			widget.setProperties({ flush: true });

			widget.expectRender(v('div', {
				key: 'foo',
				id: 'foo'
			}, [ 'qat' ]));

			widget.destroy();
		},

		'resetting mocks overrides previous'() {
			const idStack: (string | undefined)[] = [];

			class IdWidget extends WidgetBase {
				render() {
					idStack.push(this.meta(NodeId).get('foo'));
					return v('div', {
						key: 'foo',
						id: 'foo'
					}, [ 'Hello world' ]);
				}
			}

			const widget = harness(IdWidget);

			const handle1 = widget.mockMeta(NodeId, {
				get(key: string | number) {
					return 'qat';
				}
			});

			widget.getRender();

			assert.deepEqual(idStack, [ 'qat' ]);

			const handle2 = widget.mockMeta(NodeId, {
				get(key: string | number) {
					return 'baz';
				}
			});

			assert.strictEqual(handle1, handle2);

			widget.setProperties({
				key: 'bar'
			});

			widget.getRender();

			assert.deepEqual(idStack, [ 'qat', 'baz' ]);

			handle1.destroy();

			widget.destroy();
		}
	}
});
