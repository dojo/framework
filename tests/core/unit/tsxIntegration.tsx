const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../src/core/WidgetBase';
import { Registry } from '../../../src/core/Registry';
import { WNode, RenderResult } from '../../../src/core/interfaces';
import { create, tsx, fromRegistry, w } from '../../../src/core/vdom';

const registry = new Registry();

registerSuite('tsx integration', {
	'can use tsx'() {
		interface FooProperties {
			hello: string;
		}
		class Foo extends WidgetBase<FooProperties> {
			render() {
				const { hello } = this.properties;
				return (
					<header classes={['background']}>
						<div>{hello}</div>
					</header>
				);
			}
		}
		class Bar extends WidgetBase<any> {
			render() {
				return <Foo hello="world" />;
			}
		}

		class Qux extends WidgetBase<any> {
			render() {
				const LazyFoo = fromRegistry<FooProperties>('LazyFoo');
				return <LazyFoo hello="cool" />;
			}
		}

		const bar = new Bar();
		bar.registry.base = registry;
		const barRender = bar.__render__() as WNode;
		assert.deepEqual(barRender.properties, { hello: 'world' } as any);
		assert.strictEqual(barRender.widgetConstructor, Foo);
		assert.lengthOf(barRender.children, 0);

		const qux = new Qux();
		qux.registry.base = registry;
		const firstQuxRender = qux.__render__() as WNode;
		assert.strictEqual(firstQuxRender.widgetConstructor, 'LazyFoo');
	},
	'function-based typed children'() {
		const factory = create().children<{ left: () => RenderResult; right: () => RenderResult }>();
		const Foo = factory(function Foo({ children }) {
			const [c] = children();
			return (
				<div>
					<div>{c.left()}</div>
					<div>{c.right()}</div>
				</div>
			);
		});
		const Other = create()(function Other() {
			return '';
		});

		<Other>
			<div />
		</Other>;

		// types correctly
		<Foo>{{ left: () => 'left', right: () => 'right' }}</Foo>;
		// uncomment to see compile errors
		// <Foo>{{ left: () => 'left'}}</Foo>;
		// <Foo>{{ right: () => 'right'}}</Foo>;
		// <Foo><div></div></Foo>;
	},
	'string child'() {
		const factory = create().children<string>();
		const Widget = factory(({ children }) => children());

		<Widget>{'hello dojo'}</Widget>;
		w(Widget, {}, ['hello dojo']);
		Widget({}, ['hello dojo']);
		// compile errors
		// <Widget></Widget>;
		// w(Widget, {});
		// Widget({});
		// <Widget>{''}{''}</Widget>;
		// w(Widget, {}, ['hello', 'dojo'])
		// Widget({}, ['hello', 'dojo']);
	},
	'optional string child'() {
		const factory = create().children<string | undefined>();
		const Widget = factory(({ children }) => children());

		<Widget>{'hello dojo'}</Widget>;
		<Widget />;
		w(Widget, {}, ['']);
		w(Widget, {});
		Widget({}, ['']);
		Widget({});
		// compile errors
		// <Widget>{''}{''}</Widget>;
		// w(Widget, {}, ['', '']);
		// Widget({}, ['', '']);
	},
	'string children'() {
		const factory = create().children<string[]>();
		const Widget = factory(({ children }) => children());

		<Widget>
			{'hello'}
			{'dojo'}
		</Widget>;
		Widget({}, ['hello', 'dojo']);
		w(Widget, {}, ['hello', 'dojo']);
		// compile errors
		// <Widget></Widget>;
		// w(Widget, {});
		// Widget({});
		// <Widget>{''}</Widget>;
		// w(Widget, {}, '');
	},
	'optional string children'() {
		const factory = create().children<string[] | undefined>();
		const Widget = factory(({ children }) => children());

		<Widget>
			{'hello'}
			{'dojo'}
		</Widget>;
		<Widget />;
		// compile errors
		// <Widget>{''}</Widget>;
	},
	'function child'() {
		const factory = create().children<(() => string)>();
		const Widget = factory(({ children }) => {
			const [c] = children();
			return c();
		});

		<Widget>{() => ''}</Widget>;
		// compile errors
		// <Widget></Widget>;
		// <Widget>{''}</Widget>;
	},
	'optional function child'() {
		const factory = create().children<undefined | (() => string)>();
		const Widget = factory(({ children }) => {
			const [c] = children();
			if (c) {
				return c();
			}
			return null;
		});

		<Widget>{() => ''}</Widget>;
		<Widget />;
		w(Widget, {}, [() => 'hello']);
		w(Widget, {});
		Widget({}, [() => 'hello']);
		Widget({});
		// compile errors
		// <Widget>{''}</Widget>;
		// w(Widget, {}, [() => 'hello', () => 'hello']);
		// w(Widget, {}, ['']);
		// Widget({}, [() => 'hello', () => 'hello']);
		// Widget({}, ['']);
	},
	'string child with props with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<string>();
		const Widget = factory(({ children }) => children());

		<Widget>{'hello dojo'}</Widget>;
		w(Widget, {}, ['hello dojo']);
		Widget({}, ['hello dojo']);
		// compile errors
		// <Widget></Widget>;
		// w(Widget, {});
		// Widget({});
		// <Widget>{''}{''}</Widget>;
		// w(Widget, {}, ['hello', 'dojo'])
		// Widget({}, ['hello', 'dojo']);
	},
	'optional string child with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<string | undefined>();
		const Widget = factory(({ children }) => children());

		<Widget>{'hello dojo'}</Widget>;
		<Widget />;
		w(Widget, {}, ['']);
		w(Widget, {});
		Widget({}, ['']);
		Widget({});
		// compile errors
		// <Widget>{''}{''}</Widget>;
		// w(Widget, {}, ['', '']);
		// Widget({}, ['', '']);
	},
	'string children with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<string[]>();
		const Widget = factory(({ children }) => children());

		<Widget>
			{'hello'}
			{'dojo'}
		</Widget>;
		// compile errors
		// <Widget></Widget>;
		// <Widget>{''}</Widget>;
	},
	'optional string children with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<string[] | undefined>();
		const Widget = factory(({ children }) => children());

		<Widget>
			{'hello'}
			{'dojo'}
		</Widget>;
		<Widget />;
		// compile errors
		// <Widget>{''}</Widget>;
	},
	'function child with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<(() => string)>();
		const Widget = factory(({ children }) => {
			const [c] = children();
			return c();
		});

		<Widget>{() => ''}</Widget>;
		// compile errors
		// <Widget></Widget>;
		// <Widget>{''}</Widget>;
	},
	'optional function child with props'() {
		const factory = create()
			.properties<{ foo?: string }>()
			.children<undefined | (() => string)>();
		const Widget = factory(({ children }) => {
			const [c] = children();
			if (c) {
				return c();
			}
			return null;
		});

		<Widget>{() => ''}</Widget>;
		<Widget />;
		w(Widget, {}, [() => 'hello']);
		w(Widget, {});
		Widget({}, [() => 'hello']);
		Widget({});
		// compile errors
		// <Widget>{''}</Widget>;
		// w(Widget, {}, [() => 'hello', () => 'hello']);
		// w(Widget, {}, ['']);
		// Widget({}, [() => 'hello', () => 'hello']);
		// Widget({}, ['']);
	},
	'class-based widget with children'() {
		class Foo extends WidgetBase<{ foo: string }> {
			render() {
				return this.children;
			}
		}

		<Foo key="" foo="">
			<div />
		</Foo>;
	}
});
