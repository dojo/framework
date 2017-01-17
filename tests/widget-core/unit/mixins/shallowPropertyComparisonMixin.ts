import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { PropertiesChangedRecord, WidgetProperties } from '../../../src/interfaces';
import shallowPropertyComparisonMixin from '../../../src/mixins/shallowPropertyComparisonMixin';
import createWidgetBase from './../../../src/createWidgetBase';

interface TestProperties extends WidgetProperties {
	items?: { foo: string }[];
}

registerSuite({
	name: 'mixins/shallowPropertyComparisonMixin',
		'no updated properties'() {
			const properties = { id: 'id', foo: 'bar' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys.changedKeys, 0);
		},
		'updated properties'() {
			const properties = { id: 'id', foo: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys.changedKeys, 1);
		},
		'new properties'() {
			const properties = { id: 'id', foo: 'bar', bar: 'baz' };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(updatedKeys.changedKeys, 1);
		},
		'updated / new properties with falsy values'() {
			const properties = { id: 'id', foo: null, bar: '', baz: 0, qux: false };
			const updatedKeys = shallowPropertyComparisonMixin.mixin.diffProperties(<any> { id: 'id', foo: 'bar' }, <any> properties);
			assert.lengthOf(updatedKeys.changedKeys, 4);
			assert.deepEqual(updatedKeys.changedKeys, [ 'foo', 'bar', 'baz', 'qux']);
		},
		'update array item in property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 3);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items', 'otherItems' ]);
			properties.items[1] = 'c';

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
		},
		'reordered array property'() {
			const properties = {
				id: 'id',
				items: [ 'a', 'b' ],
				otherItems: [ 'c', 'd']
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 3);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items', 'otherItems' ]);
			properties.items.reverse();

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
		},
		'array property with updated object item'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 2);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items' ]);
			properties.items[0].foo = 'foo';

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
		},
		'array property updated to be empty'() {
			const properties: TestProperties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 2);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items' ]);
			properties.items!.pop();

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
		},
		'array property with new object item'() {
			const properties: any = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 2);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items' ]);
			properties.items[1] = { bar: 'foo' };

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);

			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
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

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 3);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'obj', 'otherObj' ]);
			properties.obj.foo = 'foo';

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);

			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'obj' ]);
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

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 3);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'obj', 'otherObj' ]);
			properties.obj.bar = 'foo';

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);

			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'obj' ]);
		},
		'do not ignore functions'() {
			const properties: any = {
				id: 'id',
				myFunc: () => {}
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 2);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'myFunc' ]);
			properties.myFunc = () => {};

			propertiesChanged = shallowPropertyComparisonMixin.mixin.diffProperties(propertiesChanged.properties, properties);

			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'myFunc' ]);
		},
		'test compatibility with shallowPropertyComparisonMixin'() {
			const properties = {
				id: 'id',
				items: [
					{ foo: 'bar' }
				]
			};

			let propertiesChanged: PropertiesChangedRecord<TestProperties> = shallowPropertyComparisonMixin.mixin.diffProperties({}, properties);
			assert.lengthOf(propertiesChanged.changedKeys, 2);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'id', 'items' ]);
			properties.items[0].foo = 'foo';

			const widgetBase = createWidgetBase.mixin(shallowPropertyComparisonMixin)({ properties });
			propertiesChanged = widgetBase.diffProperties(propertiesChanged.properties, properties);

			assert.lengthOf(propertiesChanged.changedKeys, 1);
			assert.deepEqual(propertiesChanged.changedKeys, [ 'items' ]);
		}
});
