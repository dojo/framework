const { describe, it, after, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { harness } from '../../../../src/testing/harness/harness';
import { WidgetBase } from '../../../../src/core/WidgetBase';
import { v, w, tsx, create } from '../../../../src/core/vdom';
import assertionTemplate, { Ignore } from '../../../../src/testing/harness/assertionTemplate';

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

const baseAssertion = assertionTemplate(() =>
	v('div', { '~key': 'root', classes: ['root'] }, [
		v('h2', { '~key': 'header' }, ['hello']),
		undefined,
		v('ul', [v('li', { '~key': 'li-one', foo: 'a' }, ['one']), v('li', ['two']), v('li', ['three'])]),
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

const baseListAssertion = assertionTemplate(() => v('div', { classes: ['root'] }, [v('ul', [])]));

class MultiRootWidget extends WidgetBase<{ after?: boolean; last?: boolean }> {
	render() {
		const { after, last = true } = this.properties;
		const result = [v('div', ['first'])];
		if (after) {
			result.push(v('div', ['after']));
		}
		if (last) {
			result.push(v('div', ['last']));
		}
		return result;
	}
}

const baseMultiRootAssertion = assertionTemplate(() => [
	v('div', { '~key': 'first' }, ['first']),
	v('div', { '~key': 'last' }, ['last'])
]);

const tsxAssertion = assertionTemplate(() => (
	<div classes={['root']}>
		<h2>hello</h2>
		<ul>
			<li assertion-key="li-one" foo="a">
				one
			</li>
			<li>two</li>
			<li>three</li>
		</ul>
	</div>
));

let consoleStub = stub(console, 'warn');

describe('assertionTemplate', () => {
	afterEach(() => {
		consoleStub.resetHistory();
	});

	after(() => {
		consoleStub.restore();
	});

	it('can get a property', () => {
		const classes = baseAssertion.getProperty('~root', 'classes');
		assert.deepEqual(classes, ['root']);
	});

	it('can get properties', () => {
		const properties = baseAssertion.getProperties('~root');
		assert.deepEqual(properties, { '~key': 'root', classes: ['root'] });
	});

	it('can get a child', () => {
		const children = baseAssertion.getChildren('~header');
		assert.equal(children[0], 'hello');
	});

	it('can assert a base assertion', () => {
		const h = harness(() => w(MyWidget, {}));
		h.expect(baseAssertion);
	});

	it('can set a property', () => {
		const h = harness(() => w(MyWidget, { toggleProperty: true }));
		const propertyAssertion = baseAssertion.setProperty('~li-one', 'foo', 'b');
		h.expect(propertyAssertion);
	});

	it('can set properties', () => {
		const h = harness(() => w(MyWidget, { toggleProperty: true }));
		const propertyAssertion = baseAssertion.setProperties('~li-one', { foo: 'b' });
		h.expect(propertyAssertion);
	});

	it('can set properties and use the actual properties', () => {
		const h = harness(() => w(MyWidget, { toggleProperty: true }));
		const propertyAssertion = baseAssertion.setProperties('~li-one', (actualProps: any) => {
			return actualProps;
		});
		h.expect(propertyAssertion);
	});

	it('can remove a node', () => {
		const h = harness(() => w(MyWidget, { removeHeader: true }));
		const childAssertion = baseAssertion.remove('~header');
		h.expect(childAssertion);
	});

	it('can remove a node in the root', () => {
		const h = harness(() => w(MultiRootWidget, { last: false }));
		const insertionAssertion = baseMultiRootAssertion.remove('~last');
		h.expect(insertionAssertion);
	});

	it('can replace a node', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.replace('~header', v('h2', ['replace']));
		h.expect(childAssertion);
	});

	it('can replace a node in the root', () => {
		const h = harness(() => w(MyWidget, { removeHeader: true, before: true }));
		const childAssertion = baseAssertion.replace('~header', v('span', ['before']));
		h.expect(childAssertion);
	});

	it('can set a child', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['replace']);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set a child with a factory function', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', () => ['replace']);
		h.expect(childAssertion);
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

		const baseAssertion = assertionTemplate(() => v('div', { key: 'parent', classes: ['root'] }, []));

		const childAssertion = baseAssertion.setChildren('@parent', () => [<div key="child">hello</div>]);

		const h = harness(() => w(Widget, {}));
		const h1 = harness(() => w(WidgetWithProps, {}));
		h.expect(childAssertion);
		const propertyAssertion = childAssertion.setProperty('@child', 'disabled', true);
		h1.expect(propertyAssertion);
		h.expect(childAssertion);
	});

	it('can set a child with replace', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.replaceChildren('~header', ['replace']);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set a child with replace with a factory function', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.replaceChildren('~header', () => ['replace']);
		h.expect(childAssertion);
	});

	it('can set a child with prepend', () => {
		const h = harness(() => w(MyWidget, { prependChild: true }));
		const childAssertion = baseAssertion.prepend('~header', ['prepend']);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set a child with prepend with a factory function', () => {
		const h = harness(() => w(MyWidget, { prependChild: true }));
		const childAssertion = baseAssertion.prepend('~header', () => ['prepend']);
		h.expect(childAssertion);
	});

	it('can set a child with append', () => {
		const h = harness(() => w(MyWidget, { appendChild: true }));
		const childAssertion = baseAssertion.append('~header', ['append']);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set a child with append with a factory function', () => {
		const h = harness(() => w(MyWidget, { appendChild: true }));
		const childAssertion = baseAssertion.append('~header', () => ['append']);
		h.expect(childAssertion);
	});

	it('can set children after with insert', () => {
		const h = harness(() => w(MyWidget, { after: true }));
		const childAssertion = baseAssertion.insertAfter('ul', [v('span', ['after'])]);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set children after with insert with a factory function', () => {
		const h = harness(() => w(MyWidget, { after: true }));
		const childAssertion = baseAssertion.insertAfter('ul', () => [v('span', ['after'])]);
		h.expect(childAssertion);
	});

	it('can insert after a node in the root', () => {
		const h = harness(() => w(MultiRootWidget, { after: true }));
		const insertionAssertion = baseMultiRootAssertion.insertAfter('~first', () => [v('div', {}, ['after'])]);
		h.expect(insertionAssertion);
	});

	it('can set children before with insert', () => {
		const h = harness(() => w(MyWidget, { before: true }));
		const childAssertion = baseAssertion.insertBefore('ul', [v('span', ['before'])]);
		assert.isTrue(consoleStub.calledOnce);
		assert.strictEqual(
			consoleStub.firstCall.args[0],
			'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
		);
		h.expect(childAssertion);
	});

	it('can set children before with insert with a factory function', () => {
		const h = harness(() => w(MyWidget, { before: true }));
		const childAssertion = baseAssertion.insertBefore('ul', () => [v('span', ['before'])]);
		h.expect(childAssertion);
	});

	it('can be used with tsx', () => {
		const h = harness(() => <MyWidget toggleProperty={true} />);
		const propertyAssertion = tsxAssertion.setProperty('~li-one', 'foo', 'b');
		h.expect(propertyAssertion);
	});

	it('should throw an error when selector is not found', () => {
		const h = harness(() => w(MyWidget, {}));
		assert.throws(
			() => h.expect(baseAssertion.setProperty('~cant-spell', 'foo', 'b')),
			'Node not found for selector "~cant-spell"'
		);
	});

	it('can use ignore', () => {
		const h = harness(() => w(ListWidget, {}));
		const nodes = [];
		for (let i = 0; i < 28; i++) {
			nodes.push(w(Ignore, {}));
		}
		const childListAssertion = baseListAssertion.replaceChildren('ul', [
			v('li', ['item: 0']),
			...nodes,
			v('li', ['item: 29'])
		]);
		h.expect(childListAssertion);
	});

	it('should be immutable', () => {
		const fooAssertion = baseAssertion
			.setChildren(':root', ['foo'])
			.setProperty(':root', 'foo', true)
			.setProperty(':root', 'bar', false);
		const barAssertion = fooAssertion
			.setChildren(':root', ['bar'])
			.setProperty(':root', 'foo', false)
			.setProperty(':root', 'bar', true);

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
