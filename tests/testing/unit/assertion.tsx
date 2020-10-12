const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { renderer, wrap, ignore, assertion } from '../../../src/testing/renderer';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { v, w, tsx, create } from '../../../src/core/vdom';
import { DNode, RenderResult } from '../../../src/core/interfaces';

class MyWidget extends WidgetBase<{
	toggleProperty?: boolean;
	prependChild?: boolean;
	appendChild?: boolean;
	replaceChild?: boolean;
	removeHeader?: boolean;
	before?: boolean;
	after?: boolean;
}> {
	render() {
		const {
			toggleProperty,
			prependChild,
			appendChild,
			replaceChild,
			removeHeader,
			before,
			after
		} = this.properties;
		let children = ['hello'];
		if (prependChild) {
			children = ['prepend', ...children];
		}
		if (appendChild) {
			children = [...children, 'append'];
		}
		if (replaceChild) {
			children = ['replace'];
		}
		return v('div', { classes: ['root'] }, [
			removeHeader ? undefined : v('h2', children),
			before ? v('span', ['before']) : undefined,
			v('ul', [v('li', { foo: toggleProperty ? 'b' : 'a' }, ['one']), v('li', ['two']), v('li', ['three'])]),
			after ? v('span', ['after']) : undefined
		]);
	}
}

const WrappedRoot = wrap('div');
const WrappedHeader = wrap('h2');
const WrappedList = wrap('ul');
const WrappedListItem = wrap('li');

const baseAssertion = assertion(() =>
	v(WrappedRoot.tag, { classes: ['root'] }, [
		v(WrappedHeader.tag, {}, ['hello']),
		undefined,
		v(WrappedList.tag, [v(WrappedListItem.tag, { foo: 'a' }, ['one']), v('li', ['two']), v('li', ['three'])]),
		undefined
	])
);

class ListWidget extends WidgetBase {
	render() {
		let children = [];
		for (let i = 0; i < 30; i++) {
			children.push(v('li', [`item: ${i}`]));
		}
		return v('div', { classes: ['root'] }, [v('ul', children)]);
	}
}

const baseListAssertion = assertion(() => v('div', { classes: ['root'] }, [v(WrappedList.tag, [])]));

const First = create().children<string>()(({ children }) => <div>{children()}</div>);
class MultiRootWidget extends WidgetBase<{ after?: boolean; last?: boolean }> {
	render() {
		const { after, last = true } = this.properties;
		const result: DNode[] = [w(First, {}, ['first'])];
		if (after) {
			result.push(v('div', ['after']));
		}
		if (last) {
			result.push(v('div', ['last']));
		}
		return result;
	}
}

const WrappedFirst = wrap(First);
const WrappedSecond = wrap('div');

const baseMultiRootAssertion = assertion(() => [
	<WrappedFirst>first</WrappedFirst>,
	<WrappedSecond>last</WrappedSecond>
]);

const tsxAssertion = assertion(() => (
	<div classes={['root']}>
		<h2>hello</h2>
		<ul>
			<WrappedListItem foo="a">one</WrappedListItem>
			<li>two</li>
			<li>three</li>
		</ul>
	</div>
));

describe('new/assertion', () => {
	it('can get a property', () => {
		const classes = baseAssertion.getProperty(WrappedRoot, 'classes');
		assert.deepEqual(classes, ['root']);
	});

	it('can get properties', () => {
		const properties = baseAssertion.getProperties(WrappedRoot);
		assert.deepEqual(properties, { classes: ['root'] });
	});

	it('can get a child', () => {
		const children = baseAssertion.getChildren(WrappedHeader);
		// TODO this is pony
		assert.equal(Array.isArray(children) ? children[0] : children, 'hello');
	});

	it('can get a child of a functional child widget', () => {
		const AWidget = create().children<{ foo(): RenderResult }>()(({ children }) => children()[0].foo());
		const WrappedDiv = wrap('div');
		const testAssertion = assertion(() => (
			<div>
				<AWidget>
					{{
						foo: () => [<WrappedDiv>child</WrappedDiv>]
					}}
				</AWidget>
			</div>
		));
		assert.deepEqual(testAssertion.getChildren(WrappedDiv), ['child']);
	});

	it('can assert a base assertion', () => {
		const r = renderer(() => w(MyWidget, {}));
		r.expect(baseAssertion);
	});

	it('can set a property', () => {
		const r = renderer(() => w(MyWidget, { toggleProperty: true }));
		r.expect(baseAssertion.setProperty(WrappedListItem, 'foo', 'b'));
	});

	it('can set properties', () => {
		const r = renderer(() => w(MyWidget, { toggleProperty: true }));
		r.expect(baseAssertion.setProperties(WrappedListItem, { foo: 'b' }));
	});

	it('can set properties on a widget', () => {
		class MyClassWidget extends WidgetBase<{ foo: string; bar?: number }> {}
		const MyFunctionWidget = create().properties<{ foo: string; bar?: number }>()(function MyFunctionWidget() {
			return 'test';
		});
		const MyWidget = create()(function MyWidget() {
			return (
				<div>
					<MyClassWidget foo="foo" bar={1} />
					<MyFunctionWidget foo="foo" bar={1} />
				</div>
			);
		});
		const WrappedClassWidget = wrap(MyClassWidget);
		const WrappedFunctionWidget = wrap(MyFunctionWidget);
		const template = assertion(() => (
			<div>
				<WrappedClassWidget foo="bar" bar={2} />
				<WrappedFunctionWidget foo="bar" bar={2} />
			</div>
		));

		const r = renderer(() => <MyWidget />);
		const updatedTemplate = template
			.setProperty(WrappedClassWidget, 'foo', 'foo')
			// type error as property type is not correct
			// .setProperty(WrappedClassWidget, 'foo', 1)
			.setProperty(WrappedClassWidget, 'bar', 1)
			.setProperty(WrappedFunctionWidget, 'foo', 'foo')
			.setProperty(WrappedFunctionWidget, 'bar', 1);

		r.expect(updatedTemplate);
	});

	it('can set properties and use the actual properties', () => {
		const propertyAssertion = baseAssertion.setProperties(WrappedListItem, (actualProps: any) => {
			return actualProps;
		});
		const r = renderer(() => w(MyWidget, { toggleProperty: true }));
		r.expect(propertyAssertion);
	});

	it('can remove a node', () => {
		const r = renderer(() => w(MyWidget, { removeHeader: true }));
		r.expect(baseAssertion.remove(WrappedHeader));
	});

	it('can remove a node in the root', () => {
		const r = renderer(() => w(MultiRootWidget, { last: false }));
		r.expect(baseMultiRootAssertion.remove(WrappedSecond));
	});

	it('can replace a node', () => {
		const r = renderer(() => w(MyWidget, { replaceChild: true }));
		r.expect(baseAssertion.replace(WrappedHeader, v('h2', ['replace'])));
	});

	it('can replace a node in the root', () => {
		const r = renderer(() => w(MyWidget, { removeHeader: true, before: true }));
		r.expect(baseAssertion.replace(WrappedHeader, v('span', ['before'])));
	});

	it('can set a child', () => {
		const r = renderer(() => w(MyWidget, { replaceChild: true }));
		r.expect(baseAssertion.setChildren(WrappedHeader, () => ['replace']));
	});

	it('can set a child of a functional child widget', () => {
		const AWidget = create().children<{ (): RenderResult }>()(({ children }) => <div>{children()[0]()}</div>);
		const ParentWidget = create()(() => (
			<div>
				<AWidget>{() => <div>bar</div>}</AWidget>
			</div>
		));
		const WrappedWidget = wrap(AWidget);
		const r = renderer(() => <ParentWidget />);
		r.child(WrappedWidget, { foo: [] });
		const WrappedDiv = wrap('div');
		const testAssertion = assertion(() => (
			<div>
				<WrappedWidget>{() => <WrappedDiv>foo</WrappedDiv>}</WrappedWidget>
			</div>
		));
		r.expect(testAssertion.setChildren(WrappedDiv, () => ['bar']));
	});

	it('can set a child of a functional child widget that is a property on an object', () => {
		const AWidget = create().children<{ bar: RenderResult; foo(): RenderResult }>()(({ children }) => (
			<div>
				{children()[0].foo()}
				{children()[0].bar}
			</div>
		));
		const ParentWidget = create()(() => (
			<div>
				<AWidget>{{ foo: () => <div>bar</div>, bar: <div>foo</div> }}</AWidget>
			</div>
		));
		const WrappedWidget = wrap(AWidget);
		const r = renderer(() => <ParentWidget />);
		r.child(WrappedWidget, { foo: [] });
		const WrappedDiv = wrap('div');
		const testAssertion = assertion(() => (
			<div>
				<WrappedWidget>
					{{
						foo: () => <WrappedDiv>foo</WrappedDiv>,
						bar: <div>foo</div>
					}}
				</WrappedWidget>
			</div>
		));
		r.expect(testAssertion.setChildren(WrappedDiv, () => ['bar']));
	});

	it('children set should be immutable', () => {
		const factory = create();
		const Widget = factory(function Widget() {
			return (
				<div key="parent" classes={['root']}>
					<div key="child">hello</div>
				</div>
			);
		});

		const WidgetWithProps = factory(function Widget() {
			return (
				<div key="parent" classes={['root']}>
					<div disabled={true} key="child">
						hello
					</div>
				</div>
			);
		});

		const WrappedParent = wrap('div');
		const WrappedChild = wrap('div');

		const baseAssertion = assertion(() => v(WrappedParent.tag, { key: 'parent', classes: ['root'] }, []));

		const childAssertion = baseAssertion.setChildren(WrappedParent, () => [
			<WrappedChild key="child">hello</WrappedChild>
		]);

		const r = renderer(() => w(Widget, {}));
		r.expect(childAssertion);
		const h1 = renderer(() => w(WidgetWithProps, {}));
		h1.expect(childAssertion.setProperty(WrappedChild, 'disabled', true));
		r.expect(childAssertion);
	});

	it('can set a child with replace', () => {
		const r = renderer(() => w(MyWidget, { replaceChild: true }));
		r.expect(baseAssertion.replaceChildren(WrappedHeader, () => ['replace']));
	});

	it('can set a child with prepend', () => {
		const r = renderer(() => w(MyWidget, { prependChild: true }));
		r.expect(baseAssertion.prepend(WrappedHeader, () => ['prepend']));
	});

	it('can set a child with append', () => {
		const r = renderer(() => w(MyWidget, { appendChild: true }));
		r.expect(baseAssertion.append(WrappedHeader, () => ['append']));
	});

	it('can set children after with insert', () => {
		const r = renderer(() => w(MyWidget, { after: true }));
		r.expect(baseAssertion.insertAfter(WrappedList, () => [v('span', ['after'])]));
	});

	it('can insert after a node in the root', () => {
		const insertionAssertion = baseMultiRootAssertion.insertAfter(WrappedFirst, () => [<div>after</div>]);
		const r = renderer(() => w(MultiRootWidget, { after: true }));
		r.expect(insertionAssertion);
	});

	it('can set children before with insert', () => {
		const r = renderer(() => w(MyWidget, { before: true }));
		r.expect(baseAssertion.insertBefore(WrappedList, () => [v('span', ['before'])]));
	});

	it('can be used with tsx', () => {
		const r = renderer(() => <MyWidget toggleProperty={true} />);
		r.expect(tsxAssertion.setProperty(WrappedListItem, 'foo', 'b'));
	});

	it('should throw an error when selector is not found', () => {
		const UnknownWrapped = wrap('unknown');
		const r = renderer(() => w(MyWidget, {}));
		assert.throws(() => r.expect(baseAssertion.setProperty(UnknownWrapped, 'foo', 'b')), 'Unable to find node');
	});

	it('can use ignore', () => {
		const nodes: DNode[] = [];
		const IgnoredListItem = ignore('li');
		for (let i = 0; i < 28; i++) {
			nodes.push(w(IgnoredListItem, {}));
		}
		const childListAssertion = baseListAssertion.replaceChildren(WrappedList, () => [
			v('li', ['item: 0']),
			...nodes,
			v('li', ['item: 29'])
		]);
		const r = renderer(() => w(ListWidget, {}));
		r.expect(childListAssertion);
	});

	it('will not ignore when the node type does not match', () => {
		const nodes: DNode[] = [];
		const IgnoredListItem = ignore('div');
		for (let i = 0; i < 28; i++) {
			nodes.push(w(IgnoredListItem, {}));
		}
		const childListAssertion = baseListAssertion.replaceChildren(WrappedList, () => [
			v('li', ['item: 0']),
			...nodes,
			v('li', ['item: 29'])
		]);
		const r = renderer(() => w(ListWidget, {}));
		assert.throws(() => r.expect(childListAssertion));
	});

	it('should be immutable', () => {
		const fooAssertion = baseAssertion
			.setChildren(WrappedRoot, () => ['foo'])
			.setProperty(WrappedRoot, 'foo', true)
			.setProperty(WrappedRoot, 'bar', false);
		const barAssertion = fooAssertion
			.setChildren(WrappedRoot, () => ['bar'])
			.setProperty(WrappedRoot, 'foo', false)
			.setProperty(WrappedRoot, 'bar', true);

		const foo = fooAssertion() as any;
		const bar = barAssertion() as any;
		assert.equal(foo!.children[0], 'foo');
		assert.equal(bar!.children[0], 'bar');
		assert.equal(foo!.properties.foo, true);
		assert.equal(foo!.properties.bar, false);
		assert.equal(bar!.properties.foo, false);
		assert.equal(bar!.properties.bar, true);
	});
});
