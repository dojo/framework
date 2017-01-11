import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import shallowPropertyComparisonMixin from '../../../src/mixins/shallowPropertyComparisonMixin';
import createWidgetBase from './../../../src/createWidgetBase';

registerSuite({
	name: 'mixins/shallowPropertyComparisonMixin',
		'no updated properties'() {
			const properties = { id: 'id', foo: 'bar' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys, 0);
		},
		'updated properties'() {
			const properties = { id: 'id', foo: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys, 1);
		},
		'new properties'() {
			const properties = { id: 'id', foo: 'bar', bar: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys, 1);
		},
		'updated / new properties with falsy values'() {
			const properties = { id: 'id', foo: null, bar: '', baz: 0, qux: false };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, <any> properties);
			assert.lengthOf(updatedKeys, 4);
			assert.deepEqual(updatedKeys, [ 'foo', 'bar', 'baz', 'qux']);
		},
		'update array item in property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items[1] = 'c';

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'reordered array property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items.reverse();

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'array property with updated object item'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items[0].foo = 'foo';

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'array property updated to be empty'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items.pop();

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'array property with new object item'() {
			const properties: any = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items[1] = { bar: 'foo' };

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'updated value in property object'() {
			const properties = {
				id: 'id',
				obj: {
					foo: 'bar'
				},
				otherObj: {
					baz: 'qux'
				}
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).obj.foo = 'foo';

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'obj' ]);
		},
		'new key in property object'() {
			const properties: any = {
				id: 'id',
				obj: {
					foo: 'bar'
				},
				otherObj: {
					baz: 'qux'
				}
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).obj.bar = 'foo';

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'obj' ]);
		},
		'do not ignore functions'() {
			const properties: any = {
				id: 'id',
				myFunc: () => {}
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).myFunc = () => {};

			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
		},
		'test compatibility with shallowPropertyComparisonMixin'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};
			const updatedProperties = shallowPropertyComparisonMixin.mixin.assignProperties({}, properties, []);
			(<any> updatedProperties).items[0].foo = 'foo';

			const widgetBase = createWidgetBase.mixin(shallowPropertyComparisonMixin)({ properties });
			const updatedKeys = widgetBase.diffProperties(properties, updatedProperties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		}

});
