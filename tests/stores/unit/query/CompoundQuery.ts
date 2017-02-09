import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import CompoundQuery  from '../../../src/query/CompoundQuery';
import { QueryType } from '../../../src/query/interfaces';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import { createData, ItemType } from '../support/createData';
import createFilter from '../../../src/query/createFilter';

registerSuite({
	name: 'CompoundQuery',

	'Should create a Query of type CompoundQuery.'() {
		assert.strictEqual(new CompoundQuery( { query: <any> null } ).queryType, QueryType.Compound);
	},
	'Should create a CompoundQuery from a filter.'() {
		const data = createData();
		const query = new CompoundQuery( {
			query: createFilter<{ value: number }>().lessThan('value', 2)
		} );
		assert.deepEqual(query.apply(data), [data[0]]);
	},
	'Should create a CompoundQuery from a sort.'() {
		const data = createData();
		const _data = createData();
		const query = new CompoundQuery( {
			query: createSort<ItemType>('id', true)
		} );
		assert.deepEqual(query.apply(data), [_data[2], _data[1], _data[0]]);
	},
	'Should create a CompoundQuery from a range.'() {
		const data = createData();
		const query = new CompoundQuery( {
			query: createRange(2, 1)
		} );
		assert.deepEqual(query.apply(data), [data[2]]);
	},
	'Should compound another query.'() {
		const data = createData();
		const _data = createData();
		const query = new CompoundQuery( {
			query: createFilter<{ value: number }>().lessThan('value', 3)
		} )
			.withQuery( createSort<ItemType>('id', true) );

		assert.deepEqual(query.apply(data), [_data[1], _data[0]]);
	},
	'Should compound multiple queries.'() {
		const data = createData();
		const _data = createData();
		const query = new CompoundQuery( {
			query: createFilter<{ value: number }>().lessThan('value', 3)
		} )
			.withQuery( createSort<ItemType>('id', true) )
			.withQuery( createRange<ItemType>(1, 1) );

		assert.deepEqual(query.apply(data), [_data[0]]);
	},
	'Should compound another compound query.'() {
		const data = createData();
		const _data = createData();
		const query1 = new CompoundQuery({
			query: createSort<ItemType>('id', true)
		})
			.withQuery( createRange<ItemType>(1, 1) );

		const query = new CompoundQuery( {
			query: createFilter<{ value: number }>().lessThan('value', 3)
		} )
			.withQuery(query1);

		assert.deepEqual(query.apply(data), [_data[0]]);
	},
	'Should have a toString that describes its properties'() {
		const query = new CompoundQuery( {
			query: createFilter<{ value: number }>().lessThan('value', 3)
		} )
			.withQuery( createSort<ItemType>('id', true) );

		assert.strictEqual( query.toString(), 'lt(value, 3)&sort(-id)' );
	},

	'Should return an empty string when serializing an empty compound query'(this: any) {
		assert.strictEqual(new CompoundQuery().toString(), '', 'Should have returned an empty string');
	},

	'Should be able to identify whether this compound query is incremental'(this: any) {
		const incrementalQuery = new CompoundQuery()
			.withQuery(createFilter())
			.withQuery(createSort<any>('any'))
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

		const nonIncrementalQuery = new CompoundQuery()
			.withQuery(createFilter())
			.withQuery(createRange(0, 10));

		assert.isTrue(incrementalQuery.incremental, 'Should have returned true for incremental query');
		assert.isFalse(nonIncrementalQuery.incremental, 'Should have returned false for non-incremental query');
	},

	'Should be able to return array of queries'(this: any) {
		const queries = [
			createFilter(),
			createSort<any>('any'),
			createRange(0, 10)
		];

		const compoundQuery = queries.reduce((prev, next) => prev.withQuery(next), new CompoundQuery());

		assert.deepEqual(compoundQuery.queries, queries, 'Should return queries');
	}
});
