import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { deepAssign } from 'dojo-core/lang';
import shallowPropertyComparisonMixin from '../../../src/mixins/shallowPropertyComparisonMixin';
import createWidgetBase from './../../../src/createWidgetBase';

registerSuite({
	name: 'mixins/shallowPropertyComparisonMixin',
		'no updated properties'() {
			(<any> shallowPropertyComparisonMixin.mixin).properties = { id: 'id', foo: 'bar' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties({ id: 'id', foo: 'bar' });
			assert.lengthOf(updatedKeys, 0);
		},
		'updated properties'() {
			(<any> shallowPropertyComparisonMixin.mixin).properties = { id: 'id', foo: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties({ id: 'id', foo: 'bar' });
			assert.lengthOf(updatedKeys, 1);
		},
		'new properties'() {
			(<any> shallowPropertyComparisonMixin.mixin).properties = { id: 'id', foo: 'bar', bar: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties({ id: 'id', foo: 'bar' });
			assert.lengthOf(updatedKeys, 1);
		},
		'updated / new properties with falsy values'() {
			(<any> shallowPropertyComparisonMixin.mixin).properties = { id: 'id', foo: null, bar: '', baz: 0, qux: false };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties({ id: 'id', foo: 'bar' });
			assert.lengthOf(updatedKeys, 4);
			assert.deepEqual(updatedKeys, [ 'foo', 'bar', 'baz', 'qux']);
		},
		'update array item in property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.items[1] = 'c';

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		},
		'reordered array property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.items = updatedProperties.items.reverse();

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
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
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.items[0].foo = 'foo';

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
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
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.items[1] = { bar: 'foo' };

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
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
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.obj.foo = 'foo';

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
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
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.obj.bar = 'foo';

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'obj' ]);
		},
		'ignore functions'() {
			const properties: any = {
				id: 'id',
				myFunc: () => {}
			};
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.myFunc = () => {};

			(<any> shallowPropertyComparisonMixin.mixin).properties = updatedProperties;
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(properties);
			assert.lengthOf(updatedKeys, 0);
		},
		'test compatibility with shallowPropertyComparisonMixin'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};
			const updatedProperties = deepAssign({}, properties);
			updatedProperties.items[0].foo = 'foo';

			const widgetBase = createWidgetBase.mixin(shallowPropertyComparisonMixin)({ properties });
			widgetBase.properties = updatedProperties;
			const updatedKeys = widgetBase.diffProperties(properties);
			assert.lengthOf(updatedKeys, 1);
			assert.deepEqual(updatedKeys, [ 'items' ]);
		}

});
