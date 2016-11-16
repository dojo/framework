import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCompoundQuery from '../../../src/query/createCompoundQuery';
import { QueryType } from '../../../src/query/interfaces';
import createFilter from '../../../src/query/createFilter';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import { createData } from '../support/createData';

registerSuite({
	name: 'createQuery',

	'Should create a Query of type CompoundQuery.'() {
		assert.strictEqual(createCompoundQuery( { query: <any> null } ).queryType, QueryType.Compound);
	},
	'Should create a CompoundQuery from a filter.'() {
		const data = createData();
		const query = createCompoundQuery( {
			query: createFilter().lessThan('id', 2)
		} );
		assert.deepEqual(query.apply(data), [data[0]]);
	},
	'Should create a CompoundQuery from a sort.'() {
		const data = createData();
		const _data = createData();
		const query = createCompoundQuery( {
			query: createSort('id', true)
		} );
		assert.deepEqual(query.apply(data), [_data[2], _data[1], _data[0]]);
	},
	'Should create a CompoundQuery from a range.'() {
		const data = createData();
		const query = createCompoundQuery( {
			query: createRange(2, 1)
		} );
		assert.deepEqual(query.apply(data), [data[2]]);
	},
	'Should compound another query.'() {
		const data = createData();
		const _data = createData();
		const query = createCompoundQuery( {
			query: createFilter().lessThan('id', 3)
		} )
			.withQuery( createSort('id', true) );

		assert.deepEqual(query.apply(data), [_data[1], _data[0]]);
	},
	'Should compound multiple queries.'() {
		const data = createData();
		const _data = createData();
		const query = createCompoundQuery( {
			query: createFilter().lessThan('id', 3)
		} )
			.withQuery( createSort('id', true) )
			.withQuery( createRange(1, 1) );

		assert.deepEqual(query.apply(data), [_data[0]]);
	},
	'Should compound another compound query.'() {
		const data = createData();
		const _data = createData();
		const query1 = createCompoundQuery({
			query: createSort('id', true)
		})
			.withQuery( createRange(1, 1) );

		const query = createCompoundQuery( {
			query: createFilter().lessThan('id', 3)
		} )
			.withQuery(query1);

		assert.deepEqual(query.apply(data), [_data[0]]);
	},
	'Should have a toString that describes its properties'() {
		const query = createCompoundQuery( {
			query: createFilter().lessThan('id', 3)
		} )
			.withQuery( createSort('id', true) );

		assert.strictEqual( query.toString(), 'lt(id, 3)&Sort(id, -)' );
	}

});
