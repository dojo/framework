const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { renderer, wrap, compare, assertion } from '../../../src/testing/renderer';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { v, w, create, tsx, diffProperty, invalidator } from '../../../src/core/vdom';
import Set from '../../../src/shim/Set';
import Map from '../../../src/shim/Map';
import { WNode, WidgetProperties, RenderResult } from '../../../src/core/interfaces';
import icache from '../../../src/core/middleware/icache';
import { uuid } from '../../../src/core/util';

const noop: any = () => {};

class ChildWidget extends WidgetBase<{ id: string; func?: () => void }> {}

const ConditionalRender = create({ icache })(({ middleware: { icache } }) => {
	return v('div', {}, [
		icache.get('render')
			? v('div', {
					onclick: () => {
						icache.set('render', false);
					}
			  })
			: null,
		v('div', {
			onclick: () => {
				icache.set('render', true);
			}
		})
	]);
});

class MyWidget extends WidgetBase {
	_count = 0;
	_result = 'result';
	_onclick() {
		this._count++;
		this.invalidate();
	}

	_otherOnClick(count: any = 50) {
		this._count = count;
		this.invalidate();
	}

	_widgetFunction() {
		this._result = `${this._result}-result`;
		this.invalidate();
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
			this._result,
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

describe('test renderer', () => {
	describe('widget with a single top level DNode', () => {
		it('expect', () => {
			const baseAssertion = assertion(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					'result',
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);

			const r = renderer(() => w(MyWidget, {}));
			r.expect(baseAssertion);
		});

		it('Should support deferred properties', () => {
			const r = renderer(() => w(MyDeferredWidget, {}));
			r.expect(assertion(() => v('div', { classes: ['root', 'other'], styles: { marginTop: '100px' } })));
		});

		it('Should support widgets that have typed children', () => {
			class WidgetWithTypedChildren extends WidgetBase<WidgetProperties, WNode<MyDeferredWidget>> {}
			const r = renderer(() => w(WidgetWithTypedChildren, {}, [w(MyDeferredWidget, {})]));
			r.expect(assertion(() => v('div', [w(MyDeferredWidget, {})])));
		});

		it('trigger property of wrapped node', () => {
			const WrappedDiv = wrap('div');
			const baseTemplate = assertion(() =>
				v(WrappedDiv.tag, { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					'result',
					w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			const r = renderer(() => w(MyWidget, {}));
			r.expect(baseTemplate);

			r.property(WrappedDiv, 'onclick');
			r.expect(
				assertion(() =>
					v(WrappedDiv.tag, { classes: ['root', 'other'], onclick: () => {} }, [
						v(
							'span',
							{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
							['hello 50']
						),
						'result',
						w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
						w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
					])
				)
			);
			r.property(WrappedDiv, 'onclick', [100]);
			r.expect(
				assertion(() =>
					v('div', { classes: ['root', 'other'], onclick: () => {} }, [
						v(
							'span',
							{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
							['hello 100']
						),
						'result',
						w(ChildWidget, { key: 'widget', id: 'random-id', func: noop }),
						w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
					])
				)
			);
		});

		it('should pass all parameters to the triggered property', () => {
			const factory = create({ icache });
			const Button = create().properties<{ onClick: (first: string, second: string) => void }>()(
				function Button() {
					return '';
				}
			);
			const Widget = factory(function Widget({ middleware: { icache } }) {
				const value = icache.getOrSet('value', '');
				return (
					<div>
						<Button
							onClick={(first, second) => {
								icache.set('value', `${first}-${second}`);
							}}
						/>
						<span>{value}</span>
					</div>
				);
			});
			const WrappedButton = wrap(Button);
			const WrappedSpan = wrap('span');
			const baseTemplate = assertion(() => (
				<div>
					<WrappedButton onClick={() => {}} />
					<WrappedSpan />
				</div>
			));
			const r = renderer(() => w(Widget, {}));
			r.expect(baseTemplate);
			r.property(WrappedButton, 'onClick', 'one', 'two');
			r.expect(baseTemplate.replaceChildren(WrappedSpan, () => ['one-two']));
		});

		it('trigger property of wrapped widget', () => {
			const WrappedChild = wrap(ChildWidget);
			const baseTemplate = assertion(() =>
				v('div', { classes: ['root', 'other'], onclick: () => {} }, [
					v(
						'span',
						{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
						['hello 0']
					),
					'result',
					w(WrappedChild, { key: 'widget', id: compare(() => true), func: noop }),
					w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
				])
			);
			const r = renderer(() => w(MyWidget, {}));
			r.expect(baseTemplate);
			r.property(WrappedChild, 'func');
			r.expect(
				assertion(() =>
					v('div', { classes: ['root', 'other'], onclick: () => {} }, [
						v(
							'span',
							{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
							['hello 0']
						),
						'result-result',
						w(WrappedChild, { key: 'widget', id: 'random-id', func: noop }),
						w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
					])
				)
			);
			r.property(WrappedChild, 'func');
			r.expect(
				assertion(() =>
					v('div', { classes: ['root', 'other'], onclick: () => {} }, [
						v(
							'span',
							{ key: 'span', classes: 'span', style: 'width: 100px', id: 'random-id', onclick: () => {} },
							['hello 0']
						),
						'result-result-result',
						w(WrappedChild, { key: 'widget', id: 'random-id', func: noop }),
						w<ChildWidget>('registry-item', { key: 'registry', id: 'random-id' })
					])
				)
			);
		});

		it('triggers property when there are undefined children in actual render', () => {
			const WrappedRoot = wrap('div');
			const WrappedChild = wrap('div');
			const WrappedConditional = wrap('div');
			const baseTemplate = assertion(() => v(WrappedRoot.tag, {}, [v(WrappedChild.tag, { onclick: noop })]));
			const r = renderer(() => w(ConditionalRender, {}));
			r.expect(baseTemplate);
			r.property(WrappedChild, 'onclick');
			r.expect(baseTemplate.prepend(WrappedRoot, () => [v(WrappedConditional.tag, { onclick: noop })]));
			r.property(WrappedConditional, 'onclick');
			r.expect(baseTemplate);
		});

		it('should call properties in the correct order', () => {
			const factory = create({ icache });

			const MyWidget = factory(function MyWidget({ middleware: { icache } }) {
				const name = icache.getOrSet('name', 'Dojo');
				const inputValue = icache.getOrSet('input', '');
				return (
					<div>
						<button
							disabled={!inputValue}
							onclick={() => {
								icache.set('name', icache.get('input'));
								icache.set('input', '');
							}}
						>
							Update Name
						</button>
						<input
							value={inputValue}
							oninput={(event) => {
								const value = (event.target as HTMLInputElement).value;
								icache.set('input', value);
							}}
						/>
						<span>hello, </span>
						<span>{name}</span>
					</div>
				);
			});

			const r = renderer(() => <MyWidget />);

			const WrappedInput = wrap('input');
			const WrappedButton = wrap('button');
			const WrappedSpan = wrap('span');

			const template = assertion(() => (
				<div>
					<WrappedButton disabled={true} onclick={() => {}}>
						Update Name
					</WrappedButton>
					<WrappedInput value="" oninput={() => {}} />
					<span>hello, </span>
					<WrappedSpan>Dojo</WrappedSpan>
				</div>
			));
			r.expect(template);

			const nameTemplate = template.replaceChildren(WrappedSpan, () => ['Dojo.io']);

			r.property(WrappedInput, 'oninput', { target: { value: 'Dojo.io' } });
			r.property(WrappedButton, 'onclick');
			r.expect(nameTemplate);
		});

		it('should throw error when property used before first expect', () => {
			const WrappedDiv = wrap('div');
			const r = renderer(() => w(MyWidget, {}));
			assert.throws(() => {
				r.property(WrappedDiv, 'onclick');
			}, 'To use `.property` please perform an initial expect');
		});

		it('resolve functional children', () => {
			const childFunctionFactory = create().children<(value: string) => RenderResult>();

			const ChildFunctionWidget = childFunctionFactory(function ChildFunctionWidget() {
				return '';
			});

			const childObjectFactory = create().children<{
				top: (value: string) => RenderResult;
				bottom: (value: string) => RenderResult;
			}>();

			const ChildObjectFactory = childObjectFactory(function ChildObjectFactory() {
				return '';
			});

			const factory = create();

			const MyWidget = factory(function MyWidget() {
				return (
					<div>
						<ChildObjectFactory>{{ top: (value) => value, bottom: (value) => value }}</ChildObjectFactory>
						<ChildFunctionWidget>{(value) => value}</ChildFunctionWidget>
						<ChildObjectFactory>
							{{
								top: (parentTop) => parentTop,
								bottom: (parentBottom) => (
									<ChildFunctionWidget>
										{(childValue) => (
											<ChildObjectFactory>
												{{
													top: (value) => `${value}-${childValue}`,
													bottom: (value) => `${value}-${parentBottom}`
												}}
											</ChildObjectFactory>
										)}
									</ChildFunctionWidget>
								)
							}}
						</ChildObjectFactory>
					</div>
				);
			});

			const WrappedChildObjectFactory = wrap(ChildObjectFactory);
			const WrappedChildFunctionWidget = wrap(ChildFunctionWidget);

			const WrappedParentChildObjectFactory = wrap(ChildObjectFactory);
			const WrappedNestedChildFunctionWidget = wrap(ChildFunctionWidget);
			const WrappedNestedChildObjectFactory = wrap(ChildObjectFactory);
			const r = renderer(() => <MyWidget />);

			r.child(WrappedChildObjectFactory, { top: ['top'], bottom: ['bottom'] });
			r.child(WrappedChildFunctionWidget, ['func']);
			r.child(WrappedParentChildObjectFactory, { top: ['parent-top'], bottom: ['parent-bottom'] });
			r.child(WrappedNestedChildObjectFactory, { top: ['nested-top'], bottom: ['nested-bottom'] });
			r.child(WrappedNestedChildFunctionWidget, ['nested-function']);

			r.expect(
				assertion(() => (
					<div>
						<WrappedChildObjectFactory>
							{{ top: () => 'top', bottom: () => 'bottom' }}
						</WrappedChildObjectFactory>
						<WrappedChildFunctionWidget>{() => 'func'}</WrappedChildFunctionWidget>
						<WrappedParentChildObjectFactory>
							{{
								top: () => 'parent-top',
								bottom: () => (
									<WrappedNestedChildFunctionWidget>
										{() => (
											<WrappedNestedChildObjectFactory>
												{{
													top: () => 'nested-top-nested-function',
													bottom: () => 'nested-bottom-parent-bottom'
												}}
											</WrappedNestedChildObjectFactory>
										)}
									</WrappedNestedChildFunctionWidget>
								)
							}}
						</WrappedParentChildObjectFactory>
					</div>
				))
			);

			assert.throws(() => {
				r.expect(
					assertion(() => (
						<div>
							<WrappedChildObjectFactory>
								{{ top: () => 'top', bottom: () => 'bottom' }}
							</WrappedChildObjectFactory>
							<WrappedChildFunctionWidget>{() => 'func'}</WrappedChildFunctionWidget>
							<WrappedParentChildObjectFactory>
								{{
									top: () => 'parent-top',
									bottom: () => (
										<WrappedNestedChildFunctionWidget>
											{() => (
												<WrappedNestedChildObjectFactory>
													{{
														top: () => 'nested-topper-nested-function',
														bottom: () => 'nested-bottom-parent-bottomer'
													}}
												</WrappedNestedChildObjectFactory>
											)}
										</WrappedNestedChildFunctionWidget>
									)
								}}
							</WrappedParentChildObjectFactory>
						</div>
					))
				);
			});
		});

		it('should selectively named children functions but resolve assert all children', () => {
			const factory = create({ icache });

			const App = factory(function App({ middleware: { icache } }) {
				const strings = icache.getOrSet('strings', []);

				return (
					<div>
						<Widget key="widget">{{ leading: strings, trailing: () => strings }}</Widget>
						<button
							key="clicker"
							onclick={() => {
								icache.set('strings', [...(icache.get<any[]>('strings') || []), 'string']);
							}}
						>
							Add String
						</button>
					</div>
				);
			});

			interface WidgetChildren {
				leading: string[];
				trailing: () => RenderResult;
			}

			const widgetFactory = create().children<WidgetChildren>();

			const Widget = widgetFactory(function Widget({ children }) {
				const [{ leading }] = children();

				return <div>The strings are {leading.join(', ')}</div>;
			});

			const r = renderer(() => <App />);

			const WrappedWidget = wrap(Widget);
			const WrappedButton = wrap('button');
			const baseAssertion = assertion(() => (
				<div>
					<WrappedWidget key="widget">{{ leading: [], trailing: () => [] }}</WrappedWidget>
					<WrappedButton key="clicker" onclick={() => undefined}>
						Add String
					</WrappedButton>
				</div>
			));

			r.child(WrappedWidget, { trailing: [] });
			r.expect(baseAssertion);
			r.property(WrappedButton, 'onclick');
			r.expect(
				baseAssertion.setChildren(WrappedWidget, () => ({ leading: ['string'], trailing: () => ['string'] }))
			);
			r.property(WrappedButton, 'onclick');
			r.expect(
				baseAssertion.setChildren(WrappedWidget, () => ({
					leading: ['string', 'string'],
					trailing: () => ['string', 'string']
				}))
			);
		});

		it('Should be able to set a property on a named child that is a render result', () => {
			const Bar = create().children<{ bar: RenderResult }>()(({ children }) => <div>{children()[0].bar}</div>);
			const Foo = create()(function Foo() {
				return (
					<div>
						<Bar>
							{{
								bar: <div disabled={true}>foo</div>
							}}
						</Bar>
					</div>
				);
			});
			const r = renderer(() => <Foo />);
			const WrappedBar = wrap(Bar);
			const WrappedDiv = wrap('div');
			const testAssertion = assertion(() => (
				<div>
					<WrappedBar>
						{{
							bar: <WrappedDiv>foo</WrappedDiv>
						}}
					</WrappedBar>
				</div>
			));
			r.expect(testAssertion.setProperty(WrappedDiv, 'disabled', true));
		});

		it('Should use custom comparator for the template assertion', () => {
			const factory = create();
			const WrappedSpan = wrap('span');
			const MyWidget = factory(function MyWidget() {
				return (
					<div>
						<span id={uuid()} />
					</div>
				);
			});
			const r = renderer(() => <MyWidget />);
			r.expect(
				assertion(() => (
					<div>
						<WrappedSpan id={compare((actual) => typeof actual === 'string')} />
					</div>
				))
			);
		});

		it('Should fail with an unsuccessful custom compare', () => {
			const factory = create();
			const WrappedSpan = wrap('span');
			const MyWidget = factory(function MyWidget() {
				return (
					<div>
						<span id={uuid()} />
					</div>
				);
			});
			const r = renderer(() => <MyWidget />);
			assert.throws(() => {
				r.expect(
					assertion(() => (
						<div>
							<WrappedSpan id={compare((actual) => typeof actual !== 'string')} />
						</div>
					))
				);
			});
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
			const r = renderer(() => w(Foo, { foo, bar }));
			r.expect(assertion(() => w(Bar, { foo, bar })));
		});

		it('should throw error if wrapped test node is used more than once', () => {
			const factory = create();
			const WrappedSpan = wrap('span');
			const MyWidget = factory(function MyWidget() {
				return (
					<div>
						<span>hello</span>
						<span>world</span>
					</div>
				);
			});
			const r = renderer(() => <MyWidget />);
			assert.throws(() => {
				r.expect(
					assertion(() => (
						<div>
							<WrappedSpan>hello</WrappedSpan>
							<WrappedSpan>world</WrappedSpan>
						</div>
					))
				);
			}, 'Cannot use a wrapped test node more than once within an assertion template.');
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
			const WrappedButton = wrap('button');
			const r = renderer(() => <App />);
			r.expect(
				assertion(() => (
					<div>
						<WrappedButton key="click-me" onclick={() => {}}>
							Click Me 0
						</WrappedButton>
					</div>
				))
			);
			r.property(WrappedButton, 'onclick');
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me" onclick={() => {}}>
							Click Me 1
						</button>
					</div>
				))
			);
		});

		it('should differentiate between two unnamed widgets', () => {
			const factory = create();
			const Foo = factory(() => 'foo');
			const Bar = factory(() => 'bar');
			const WidgetUnderTest = factory(() => (
				<div>
					<Foo />
				</div>
			));
			const template = assertion(() => (
				<div>
					<Bar />
				</div>
			));
			const r = renderer(() => <WidgetUnderTest />);
			assert.throws(() => {
				r.expect(template);
			});
		});

		it('should handle undefined properties', () => {
			const factory = create().properties<{ foo?: string }>();
			const Foo = factory(() => 'foo');
			const WidgetUnderTest = factory(({ properties }) => (
				<div>
					<Foo foo={properties().foo} />
				</div>
			));
			const template = assertion(() => (
				<div>
					<Foo foo={undefined} />
				</div>
			));
			const r = renderer(() => <WidgetUnderTest />);
			r.expect(template);
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
			const r = renderer(() => <App />);

			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">Click Me 1</button>
					</div>
				))
			);

			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">Click Me 2</button>
					</div>
				))
			);
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">Click Me 3</button>
					</div>
				))
			);
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
			const r = renderer(() => <App key="app" />);
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">app 0</button>
					</div>
				))
			);
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">app 1</button>
					</div>
				))
			);
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
			const r = renderer(() => <App foo="foo" />);
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">new 0</button>
					</div>
				))
			);
			r.expect(
				assertion(() => (
					<div>
						<button key="click-me">new 1</button>
					</div>
				))
			);
		});

		it('Should wrap single children in an array when calling setChildren', () => {
			const factory = create().children<string>();
			const TestWidget = factory(() => 'foo');
			const App = create()(() => {
				return <TestWidget>bar</TestWidget>;
			});
			const WrappedTestWudget = wrap(TestWidget);

			const testAssertion = assertion(() => <WrappedTestWudget>bar</WrappedTestWudget>);
			const r = renderer(() => <App />);

			r.expect(testAssertion.setChildren(WrappedTestWudget, () => 'bar'));
		});

		it('should return a consistent middleware id', () => {
			const something = create()(({ id }) => {
				return { id };
			});
			const factory = create({ something });
			const Widget = factory(({ middleware: { something } }) => {
				return something.id;
			});

			const r = renderer(() => <Widget />);
			r.expect(assertion(() => 'something'));
		});
	});
});
