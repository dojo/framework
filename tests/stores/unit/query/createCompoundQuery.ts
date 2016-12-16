import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCompoundQuery from '../../../src/query/createCompoundQuery';
import { QueryType } from '../../../src/query/interfaces';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import { createData } from '../support/createData';
import createFilter from '../../../src/query/createFilter';
import { isCompoundQuery } from '../../../src/query/createCompoundQuery';

registerSuite({
	name: 'createCompoundQuery',

	'Should create a Query of type CompoundQuery.'() {
		assert.strictEqual(createCompoundQuery( { query: <any> null } ).queryType, QueryType.Compound);
	},
	'Should create a CompoundQuery from a filter.'() {
		const data = createData();
		const query = createCompoundQuery( {
			query: createFilter().lessThan('value', 2)
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
			query: createFilter().lessThan('value', 3)
		} )
			.withQuery( createSort('id', true) );

		assert.deepEqual(query.apply(data), [_data[1], _data[0]]);
	},
	'Should compound multiple queries.'() {
		const data = createData();
		const _data = createData();
		const query = createCompoundQuery( {
			query: createFilter().lessThan('value', 3)
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
			query: createFilter().lessThan('value', 3)
		} )
			.withQuery(query1);

		assert.deepEqual(query.apply(data), [_data[0]]);
	},
	'Should have a toString that describes its properties'() {
		const query = createCompoundQuery( {
			query: createFilter().lessThan('value', 3)
		} )
			.withQuery( createSort('id', true) );

		assert.strictEqual( query.toString(), 'lt(value, 3)&Sort(id, -)' );
	},

	'Should be able to differentiate a CompoundQuery from other queries'(this: any) {
		const compundQuery = createCompoundQuery();
		const sort = createSort('any');
		const filter = createFilter();
		const range = createRange(0, 10);

		assert.isFalse(isCompoundQuery(sort), 'Returned true for non-compound query');
		assert.isFalse(isCompoundQuery(filter), 'Returned true for non-compound query');
		assert.isFalse(isCompoundQuery(range), 'Returned true for non-compound query');
		assert.isFalse(isCompoundQuery(undefined), 'Returned true for non-compound query');
		assert.isTrue(isCompoundQuery(compundQuery), 'Returned false for compound query');
	},

	'Should return an empty string when serializing an empty compound query'(this: any) {
		assert.strictEqual(createCompoundQuery().toString(), '', 'Should have returned an empty string');
	},

	'Should be able to identify whether this compound query is incremental'(this: any) {
		const incrementalQuery = createCompoundQuery()
			.withQuery(createFilter())
			.withQuery(createSort('any'))
			.withQuery({
				queryType: QueryType.Filter,
				toString() {
					return '';
				},
				apply(data: any[]) {
					return data;
				},
				incremental: true
			});

		const nonIncrementalQuery = createCompoundQuery()
			.withQuery(createFilter())
			.withQuery(createRange(0, 10));

		assert.isTrue(incrementalQuery.incremental, 'Should have returned true for incremental query');
		assert.isFalse(nonIncrementalQuery.incremental, 'Should have returned false for non-incremental query');
	},

	'Should be able to return array of queries'(this: any) {
		const queries = [
			createFilter(),
			createSort('any'),
			createRange(0, 10)
		];

		const compoundQuery = queries.reduce((prev, next) => prev.withQuery(next), createCompoundQuery());

		assert.deepEqual(compoundQuery.queries, queries, 'Should return queries');
	}
});
