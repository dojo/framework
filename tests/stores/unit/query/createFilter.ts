import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createFilter, {Filter, FilterType, BooleanOp, SimpleFilter, FilterArray} from '../../../src/query/createFilter';
import JsonPointer from '../../../src/patch/JsonPointer';

type SimpleObject = { key: number; id: string };
type NestedObject = { key: { key2: number }; id: string};
type ListWithLists = { id: string, list: number[] };
const simpleList = [
	{
		key: 5,
		id: 'item-1'
	},
	{
		key: 7,
		id: '2'
	},
	{
		key: 4,
		id: '3'
	}
];
const nestedList = [
	{
		key: {
			key2: 5
		},
		id: 'item-1'
	},
	{
		key: {
			key2: 7
		},
		id: '2'
	},
	{
		key: {
			key2: 4
		},
		id: '3'
	}
];

const listWithLists = [
	{
		list: [ 1, 2, 3 ],
		id: 'item-1'
	},
	{
		list: [ 3, 4, 5 ],
		id: '2'
	},
	{
		list: [ 4, 5, 6 ],
		id: '3'
	}
];
registerSuite({
	name: 'filter',

	'basic filter operations': {
		'with string path': {
			'less than'() {
				assert.deepEqual(createFilter<SimpleObject>().lessThan('key', 5).apply(simpleList),
					[ { key: 4, id: '3' } ], 'Less than w/string path');
			},

			'less than or equal to'() {
				assert.deepEqual(createFilter<SimpleObject>().lessThanOrEqualTo('key', 5).apply(simpleList),
					[ { key: 5, id: 'item-1' }, { key: 4, id: '3' } ], 'Less than or equal to with string path');
			},

			'greater than'() {
				assert.deepEqual(createFilter<SimpleObject>().greaterThan('key', 5).apply(simpleList),
					[ { key: 7, id: '2' } ], 'Greater than with string path');
			},

			'greater than or equal to'() {
				assert.deepEqual(createFilter<SimpleObject>().greaterThanOrEqualTo('key', 5).apply(simpleList),
					[ { key: 5, id: 'item-1' }, { key: 7, id: '2' } ], 'Greater than or equal to with string path');
			},

			'matches'() {
				assert.deepEqual(createFilter<SimpleObject>().matches('id', /[12]/).apply(simpleList),
					[ { key: 5, id: 'item-1' }, { key: 7, id: '2' } ], 'Matches with string path');
			},

			'in'() {
				assert.deepEqual(createFilter<SimpleObject>().in('key', [7, 4]).apply(simpleList),
					simpleList.slice(1), 'In with string path');
			},

			'contains'() {
				assert.deepEqual(createFilter<NestedObject>().contains('key', 'key2').apply(nestedList),
					nestedList, 'Contains with string path');

				assert.deepEqual(createFilter<NestedObject>().contains('key', 'key1').apply(nestedList),
					[], 'Contains with string path');

				assert.deepEqual(createFilter<ListWithLists>().contains('list', 4).apply(listWithLists),
					listWithLists.slice(1), 'Contains with string path');
			},

			'equalTo'() {
				assert.deepEqual(createFilter<SimpleObject>().equalTo('key', 5).apply(simpleList),
					[ { key: 5, id: 'item-1' } ], 'Equal to with string path');
			},

			'notEqualTo'() {
				assert.deepEqual(createFilter<SimpleObject>().notEqualTo('key', 5).apply(simpleList),
					[ { key: 7, id: '2' }, { key: 4, id: '3' } ], 'Not equal to with string path');
			},

			'deepEqualTo'() {
				assert.deepEqual(createFilter<NestedObject>().deepEqualTo('key', { key2: 5 }).apply(nestedList),
					[ nestedList[0] ], 'Deep equal with string path');
			},

			'notDeepEqualTo'() {
				assert.deepEqual(createFilter<NestedObject>().notDeepEqualTo('key', { key2: 5 }).apply(nestedList),
					nestedList.slice(1), 'Not deep equal with string path')	;
			},
			'filterChain should keep all filters'() {
				const filters = createFilter<SimpleObject>().lessThan('key', 5).greaterThan('key', 10).filterChain || [];
				assert.lengthOf(filters, 3);
				assert.strictEqual(filters[1], BooleanOp.And);
			},
			'SimpleFilter should have an apply that can be used individually.'() {
				const filters = createFilter<SimpleObject>().lessThan('key', 5).filterChain || [];
				const simpleFilter = <SimpleFilter<SimpleObject>> filters[0];

				assert.deepEqual(simpleFilter.apply(simpleList), [ { key: 4, id: '3' } ]);
			}
		},

		'with json path': {
			'less than'() {
				assert.deepEqual(createFilter<NestedObject>().lessThan(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 4 }, id: '3' } ], 'Less than with JSON path');
			},

			'less than or equal to'() {
				assert.deepEqual(createFilter<NestedObject>().lessThanOrEqualTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 5 }, id: 'item-1' }, { key: { key2: 4 }, id: '3' } ], 'Less than or equal to with JSON path');
			},

			'greater than'() {
				assert.deepEqual(createFilter<NestedObject>().greaterThan(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 7 }, id: '2' } ], 'Greater than with JSON path');
			},

			'greater than or equal to'() {
				assert.deepEqual(createFilter<NestedObject>().greaterThanOrEqualTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
				[ { key: { key2: 5 }, id: 'item-1' }, { key: { key2: 7 }, id: '2' }], 'Greater than or equal to with JSON path');
			},

			'matches'() {
				assert.deepEqual(createFilter<NestedObject>().matches(new JsonPointer('id'), /[12]/).apply(nestedList),
				[ { key: { key2: 5 }, id: 'item-1' }, { key: { key2: 7 }, id: '2' } ], 'Matches with JSON path');
			},

			'in'() {
				assert.deepEqual(createFilter<NestedObject>().in(new JsonPointer('key', 'key2'), [7, 4]).apply(nestedList),
					nestedList.slice(1), 'In with JSON path');
			},

			'contains'() {
				assert.deepEqual(createFilter<NestedObject>().contains(new JsonPointer('key'), 'key2').apply(nestedList),
					nestedList, 'Contains with JSON path');

				assert.deepEqual(createFilter<NestedObject>().contains(new JsonPointer('key'), 'key1').apply(nestedList),
					[], 'Contains with JSON path');
			},

			'equalTo'() {
				assert.deepEqual(createFilter<NestedObject>().equalTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[{key: { key2: 5 }, id: 'item-1'}], 'Equal to with json path');
			},

			'notEqualTo'() {
				assert.deepEqual(createFilter<NestedObject>().notEqualTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 7 }, id: '2' }, { key: { key2: 4 }, id: '3' } ], 'Not equal to with json path');
			},

			'deepEqualTo'() {
				assert.deepEqual(createFilter<NestedObject>().deepEqualTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					[ nestedList[0] ], 'Deep equal with JSON path');
			},

			'notDeepEqualTo'() {
				assert.deepEqual(createFilter<NestedObject>().notDeepEqualTo(new JsonPointer('key', 'key2'), 5).apply(nestedList),
					nestedList.slice(1), 'Not deep equal with JSON path');
			}
		},

		'custom'() {
			assert.deepEqual(createFilter<SimpleObject>().custom((item: SimpleObject) => item.key === 4 ).apply(simpleList),
					[ { key: 4, id: '3' } ], 'Not deep equal with custom filter');
		}
	},

	'compound filters': {
		'chained': {
			'automatic chaining'() {
				assert.deepEqual(createFilter<SimpleObject>().lessThanOrEqualTo('key', 5).equalTo('id', 'item-1').apply(simpleList),
					[ simpleList[0] ], 'Sequential filters chain ands automatically');
			},

			'explicit chaining \'and\''() {
				assert.deepEqual(createFilter<SimpleObject>().lessThanOrEqualTo('key', 5).and().equalTo('id', 'item-1').apply(simpleList),
					[ simpleList[0] ], 'Chaining filters with and explicitly');
			},

			'explicit chaining \'or\''() {
				assert.deepEqual(createFilter<SimpleObject>().lessThan('key', 5).or().greaterThan('key', 5).apply(simpleList),
					simpleList.slice(1), 'Chaining filters with or explicitly');
			},

			'combining \'and\' and \'or\''() {
				assert.deepEqual(createFilter<SimpleObject>()
					// explicit chaining
					.equalTo('key', 7)
					.and()
					.equalTo('id', '2')
					.or()
					// implicit chaining
					.equalTo('key', 4)
					.equalTo('id', '3')
					.apply(simpleList),
					simpleList.slice(1), 'Chaining \'and\' and \'or\' filters');
			}
		},

		'nested'() {
			const pickFirstItem = createFilter<NestedObject>()
				.lessThanOrEqualTo(new JsonPointer('key', 'key2'), 5)
				.and()
				.equalTo('id', 'item-1')
				.or()
				.greaterThanOrEqualTo(new JsonPointer('key', 'key2'), 5)
				.equalTo('id', 'item-1')
				.or()
				.greaterThan(new JsonPointer('key', 'key2'), 5)
				.equalTo('id', 'item-1');
			const pickAllItems = createFilter<NestedObject>().lessThan(new JsonPointer('key', 'key2'), 100);
			const pickNoItems = createFilter<NestedObject>().greaterThan(new JsonPointer('key', 'key2'), 100);

			const pickLastItem = createFilter<NestedObject>().equalTo('id', '3');

			assert.deepEqual(pickFirstItem.apply(nestedList), [ nestedList[0] ], 'Should pick first item');
			assert.deepEqual(pickAllItems.apply(nestedList), nestedList, 'Should pick all items');
			assert.deepEqual(pickNoItems.apply(nestedList), [], 'Should pick no items');
			assert.deepEqual(pickLastItem.apply(nestedList), [ nestedList[2] ], 'Should pick last item');
			assert.deepEqual(pickFirstItem.and(pickLastItem).apply(nestedList), [], 'Shouldn\'t pick any items');
			assert.deepEqual(pickFirstItem.or(pickLastItem).apply(nestedList), [ nestedList[0], nestedList[2] ],
				'Should have picked first and last item');

			assert.deepEqual(pickFirstItem.or(pickAllItems.and(pickNoItems)).or(pickLastItem).apply(nestedList),
				[ nestedList[0], nestedList[2] ], 'Should have picked first and last item');
		}
	},

	'from objects': {
		'nested'() {
			const individualFilter = {
				filterType: FilterType.EqualTo,
				value: 5,
				path: new JsonPointer('key', 'key2')
			};
			const pickFirstItem: FilterArray<NestedObject> = [
				{
					filterType: FilterType.LessThanOrEqualTo,
					value: 5,
					path: new JsonPointer('key', 'key2')
				},
				BooleanOp.And,
				{
					filterType: FilterType.EqualTo,
					value: 'item-1',
					path: 'id'
				},
				BooleanOp.Or,
				{
					filterType: FilterType.GreaterThanOrEqualTo,
					value: 5,
					path: new JsonPointer('key', 'key2')
				},
				{
					filterType: FilterType.EqualTo,
					value: 'item-1',
					path: 'id'
				},
				BooleanOp.Or,
				{
					filterType: FilterType.GreaterThan,
					value: 5,
					path: new JsonPointer('key', 'key2')
				},
				{
					filterType: FilterType.EqualTo,
					value: 'item-1',
					path: 'id'
				}
			];

			const pickAllItems = [
				{
					filterType: FilterType.LessThan,
					value: 100,
					path: new JsonPointer('key', 'key2')
				}
			];

			const pickNoItems = [
				{
					filterType: FilterType.GreaterThan,
					value: 100,
					path: new JsonPointer('key', 'key2')
				}
			];

			const pickLastItem: FilterArray<NestedObject> = [
				{
					filterType: FilterType.EqualTo,
					value: '3',
					path: 'id'
				}
			];

			assert.deepEqual(createFilter(pickFirstItem).apply(nestedList), [ nestedList[0] ], 'Should pick first item');
			assert.deepEqual(createFilter(pickAllItems).apply(nestedList), nestedList, 'Should pick all items');
			assert.deepEqual(createFilter(pickNoItems).apply(nestedList), [], 'Should pick no items');
			assert.deepEqual(createFilter(pickLastItem).apply(nestedList), [ nestedList[2] ], 'Should pick last item');
			assert.deepEqual(
				createFilter([ pickFirstItem, BooleanOp.And, pickLastItem ]).apply(nestedList),
				[],
				'Shouldn\'t pick any items'
			);
			assert.deepEqual(
				createFilter([ pickFirstItem, BooleanOp.Or, pickLastItem ]).apply(nestedList),
				[ nestedList[0], nestedList[2] ],
				'Should have picked first and last item'
			);

			assert.deepEqual(
				createFilter(
					[ pickFirstItem, BooleanOp.Or, [ pickAllItems, BooleanOp.And, pickNoItems ], BooleanOp.Or, pickLastItem ]
				).apply(nestedList),
				[ nestedList[0], nestedList[2] ],
				'Should have picked first and last item'
			);

			assert.deepEqual(
				createFilter(individualFilter).apply(nestedList), [ nestedList[0] ], 'Should have picked first item'
			);
		}
	},

	'serializing': {
		'simple - no path': {
			'empty filter'() {
				assert.strictEqual(createFilter().toString(), '', 'Didn\'t properly serialize empty filter');
			},

			'less than'() {
				assert.strictEqual(createFilter<SimpleObject>().lessThan('key', 3).toString(), 'lt(key, 3)',
					'Didn\'t properly serialize less than');
			},

			'greater than'() {
				assert.strictEqual(createFilter<SimpleObject>().greaterThan('key', 3).toString(), 'gt(key, 3)',
					'Didn\'t properly serialize greater than');
			},

			'equals'() {
				assert.strictEqual(createFilter<SimpleObject>().equalTo('key', 'value').toString(), 'eq(key, "value")',
					'Didn\'t properly serialize equals');
			},

			'deep equals'() {
				assert.strictEqual(createFilter<SimpleObject>().deepEqualTo('key', 'value').toString(), 'eq(key, "value")',
					'Didn\'t properly serialize deep equals');
			},

			'in'() {
				assert.strictEqual(createFilter<SimpleObject>().in('key', [1, 2, 3]).toString(), 'in(key, [1,2,3])',
					'Didn\'t properly serialize in');
			},

			'contains'() {
				assert.strictEqual(createFilter<SimpleObject>().contains('key', 'value').toString(), 'contains(key, "value")',
					'Didn\'t properly serialize contains');
			},

			'not equal'() {
				assert.strictEqual(createFilter<SimpleObject>().notEqualTo('key', 'value').toString(), 'ne(key, "value")',
					'Didn\'t properly serialize not equal');
			},

			'not deep equal'() {
				assert.strictEqual(createFilter<SimpleObject>().notDeepEqualTo('key', 'value').toString(), 'ne(key, "value")',
					'Didn\'t properly serialize not deep equal');
			},

			'less than or equal to'() {
				assert.strictEqual(createFilter<SimpleObject>().lessThanOrEqualTo('key', 3).toString(), 'lte(key, 3)',
					'Didn\'t properly serialize less than or equal to');
			},

			'greater than or equal to'() {
				assert.strictEqual(createFilter<SimpleObject>().greaterThanOrEqualTo('key', 3).toString(), 'gte(key, 3)',
					'Didn\'t properly serialize greater than or equal to');
			},

			'matches'() {
				assert.throws(() => (createFilter<SimpleObject>().matches('key', /test/).toString()), 'Cannot parse this filter type to an RQL query string');
			},

			'custom'() {
				assert.throws(() => (createFilter<any>().custom((arg: any) => true).toString()), 'Cannot parse this filter type to an RQL query string');
			}
		},

		'simple - path': {
			'less than'() {
				assert.strictEqual(createFilter().lessThan(new JsonPointer('key', 'key2'), 3).toString(),
					'lt(key/key2, 3)', 'Didn\'t properly serialize less than');
			},

			'greater than'() {
				assert.strictEqual(createFilter().greaterThan(new JsonPointer('key', 'key2'), 3).toString(),
					'gt(key/key2, 3)', 'Didn\'t properly serialize greater than');
			},

			'equals'() {
				assert.strictEqual(createFilter().equalTo(new JsonPointer('key', 'key2'), 'value').toString(),
					'eq(key/key2, "value")', 'Didn\'t properly serialize equals');
			},

			'deep equals'() {
				assert.strictEqual(createFilter().deepEqualTo(new JsonPointer('key', 'key2'), 'value').toString(),
					'eq(key/key2, "value")', 'Didn\'t properly serialize deep equals');
			},

			'in'() {
				assert.strictEqual(createFilter().in(new JsonPointer('key', 'key2'), [ 1, 2, 3 ]).toString(),
					'in(key/key2, [1,2,3])', 'Didn\'t properly serialize in');
			},

			'contains'() {
				assert.strictEqual(createFilter().contains(new JsonPointer('key', 'key2'), 'value').toString(),
					'contains(key/key2, "value")', 'Didn\'t properly serialize contains');
			},

			'not equal'() {
				assert.strictEqual(createFilter().notEqualTo(new JsonPointer('key', 'key2'), 'value').toString(),
					'ne(key/key2, "value")', 'Didn\'t properly serialize not equal');
			},

			'not deep equal'() {
				assert.strictEqual(createFilter().notDeepEqualTo(new JsonPointer('key', 'key2'), 'value').toString(),
					'ne(key/key2, "value")', 'Didn\'t properly serialize not deep equal');
			},

			'less than or equal to'() {
				assert.strictEqual(createFilter().lessThanOrEqualTo(new JsonPointer('key', 'key2'), 3).toString(),
					'lte(key/key2, 3)', 'Didn\'t properly serialize less than or equal to');
			},

			'greater than or equal to'() {
				assert.strictEqual(createFilter().greaterThanOrEqualTo(new JsonPointer('key', 'key2'), 3).toString(),
					'gte(key/key2, 3)', 'Didn\'t properly serialize greater than or equal to');
			},

			'matches'() {
				assert.throws(() => (createFilter().matches(new JsonPointer('key', 'key2'), /test/).toString()), 'Cannot parse this filter type to an RQL query string');
			}
		},

		'chained': {
			'ands'() {
				assert.strictEqual(createFilter<SimpleObject>().greaterThan('key', 3).lessThan('key', 2).in('key', [ 3 ]).toString(),
					'gt(key, 3)&lt(key, 2)&in(key, [3])', 'Didn\'t properly chain filter with ands');
			},

			'ors'() {
				assert.strictEqual(createFilter<SimpleObject>().greaterThan('key', 3).or().lessThan('key', 2).or().in('key', [ 3 ]).toString(),
					'gt(key, 3)|lt(key, 2)|in(key, [3])', 'Didn\'t properly chain filter with ors');
			},

			'combination'() {
				assert.strictEqual(createFilter<SimpleObject>().greaterThan('key', 3).lessThan('key', 3).or().in('key', [ 3 ]).toString(),
					'gt(key, 3)&lt(key, 3)|in(key, [3])', 'Didn\'t properly chain filter with ands and ors');
			}
		},

		'nested'() {
			const filterOne = createFilter<SimpleObject>().greaterThan('key', 3).lessThan('key', 2).in('key', [ 3 ]);
			const filterTwo = createFilter<SimpleObject>().greaterThan('key', 3).or().lessThan('key', 2).in('key', [ 3 ]);
			const filterThree = createFilter<SimpleObject>().greaterThan('key', 3).or().lessThan('key', 2).or().in('key', [ 3 ]);

			const compoundFilter = createFilter<SimpleObject>()
				.greaterThan('key', 3)
				.or(filterOne)
				.or()
				.lessThan('key', 2)
				.and(filterTwo.or(filterThree))
				.or()
				.in('key', [ 3 ]);

			assert.strictEqual(compoundFilter.toString(),
			'gt(key, 3)|(' + /*filter one */ 'gt(key, 3)&lt(key, 2)&in(key, [3])' + /* close or */ ')' + '|lt(key, 2)&(' +
			/*filterTwo*/ 'gt(key, 3)|lt(key, 2)&in(key, [3])|(' + /*filter three*/ 'gt(key, 3)|lt(key, 2)|in(key, [3])' +
			/*close or */')' + /*close and */ ')' + '|in(key, [3])', 'Didn\'t properly serialize compound filter');
		}
	},

	'provide custom serialization approach'() {
		function serializeFilter(filter: Filter<any>): string {
			function recursivelySerialize(filter: Filter<any>): string {
				switch (filter.filterType) {
					case FilterType.LessThan:
						return (filter.path || '').toString() + ' is less than ' + (filter.value || '');
					case FilterType.GreaterThan:
						return (filter.path || '').toString() + ' is greater than ' + (filter.value || '');
					case FilterType.EqualTo:
						return (filter.path || '').toString() + ' is equal to ' + (filter.value || '');
					case FilterType.Compound:
						return (filter.filterChain || []).reduce((prev, next) => {
							if (next === BooleanOp.And) {
								return prev + ' and';
							} else if (next === BooleanOp.Or) {
								return prev + ' or';
							} else {
								return prev + ' ' + recursivelySerialize(<Filter<any>> next);
							}
						}, '');
					default:
						return '';
				}
			}

			return 'Return any item where' + recursivelySerialize(filter);
		}

		assert.strictEqual(createFilter(undefined, serializeFilter)
			.greaterThan('key', 3)
			.lessThan('key', 5)
			.or()
			.equalTo('id', 'value')
			.toString(),
			'Return any item where key is greater than 3 and key is less than 5 or id is equal to value',
			'Didn\'t use provided serialization function'
		);
	},

	'ignore or at end of filter chain'(this: any) {
		assert.deepEqual(
			createFilter<SimpleObject>()
				.custom((item) => true)
				.notEqualTo('key', 5)
				.or()
				.apply(simpleList),
			simpleList.slice(1),
			'Or at end of filter shouldn\'t have changed the result');
	},

	'empty ands or ors at beginning of chain should not throw errors'(this: any) {
		const emptyAnd = createFilter<SimpleObject>().and();
		const emptyOr = createFilter<SimpleObject>().or();
		assert.doesNotThrow(() => {
			emptyAnd.apply(simpleList);
			emptyOr.apply(simpleList);
		}, 'Should\'t have thrown any errors');
	},

	'filter on entire object'(this: any) {
		assert.deepEqual(
			createFilter<SimpleObject>().deepEqualTo('', simpleList[0]).apply(simpleList),
			[ simpleList[0] ],
			'Should have returned the matching object'
		);
	}
});
