const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from '../../../src/testing/harness';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { v, w, tsx } from '../../../src/core/vdom';
import assertionTemplate, { Mimic } from '../../../src/testing/assertionTemplate';

class MyWidget extends WidgetBase<{
	toggleProperty?: boolean;
	prependChild?: boolean;
	appendChild?: boolean;
	replaceChild?: boolean;
	before?: boolean;
	after?: boolean;
}> {
	render() {
		const { toggleProperty, prependChild, appendChild, replaceChild, before, after } = this.properties;
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
			v('h2', children),
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

describe('assertionTemplate', () => {
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

	it('can replace a node', () => {
		const h = harness(() => w(MyWidget, {}));
		const childAssertion = baseAssertion.replace('~header', v('h2', { '~key': 'header' }, ['hello']));
		h.expect(childAssertion);
	});

	it('can set a child', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.setChildren('~header', ['replace']);
		h.expect(childAssertion);
	});

	it('can set a child with replace', () => {
		const h = harness(() => w(MyWidget, { replaceChild: true }));
		const childAssertion = baseAssertion.replaceChildren('~header', ['replace']);
		h.expect(childAssertion);
	});

	it('can set a child with prepend', () => {
		const h = harness(() => w(MyWidget, { prependChild: true }));
		const childAssertion = baseAssertion.prepend('~header', ['prepend']);
		h.expect(childAssertion);
	});

	it('can set a child with append', () => {
		const h = harness(() => w(MyWidget, { appendChild: true }));
		const childAssertion = baseAssertion.append('~header', ['append']);
		h.expect(childAssertion);
	});

	it('can set children after with insert', () => {
		const h = harness(() => w(MyWidget, { after: true }));
		const childAssertion = baseAssertion.insertAfter('ul', [v('span', ['after'])]);
		h.expect(childAssertion);
	});

	it('can set children before with insert', () => {
		const h = harness(() => w(MyWidget, { before: true }));
		const childAssertion = baseAssertion.insertBefore('ul', [v('span', ['before'])]);
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

	it('can use mimic', () => {
		const h = harness(() => w(ListWidget, {}));
		const childListAssertion = baseListAssertion.replaceChildren('ul', [
			v('li', ['item: 0']),
			...new Array(29).fill(w(Mimic, {}))
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
