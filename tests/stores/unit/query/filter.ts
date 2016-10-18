import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Filter, { createFilter, FilterType, BooleanOp, SimpleFilter } from '../../../src/query/Filter';
import { createPointer } from '../../../src/patch/JsonPointer';

type SimpleObj = { key: number; id: string };
type NestedObj = { key: { key2: number }; id: string};
type ListWithLists = { id: string, list: number[] };
const simpleList = [
	{
		key: 5,
		id: '1'
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
		id: '1'
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
		id: '1'
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
			'less than': function() {
				assert.deepEqual(createFilter<SimpleObj>().lessThan('key', 5).apply(simpleList),
					[ { key: 4, id: '3' } ], 'Less than w/string path');
			},

			'less than or equal to': function() {
				assert.deepEqual(createFilter<SimpleObj>().lessThanOrEqualTo('key', 5).apply(simpleList),
					[ { key: 5, id: '1' }, { key: 4, id: '3' } ], 'Less than or equal to with string path');
			},

			'greater than': function() {
				assert.deepEqual(createFilter<SimpleObj>().greaterThan('key', 5).apply(simpleList),
					[ { key: 7, id: '2' } ], 'Greater than with string path');
			},

			'greater than or equal to': function() {
				assert.deepEqual(createFilter<SimpleObj>().greaterThanOrEqualTo('key', 5).apply(simpleList),
					[ { key: 5, id: '1' }, { key: 7, id: '2' } ], 'Greater than or equal to with string path');
			},

			'matches': function() {
				assert.deepEqual(createFilter<SimpleObj>().matches('id', /[12]/).apply(simpleList),
					[ { key: 5, id: '1' }, { key: 7, id: '2' } ], 'Matches with string path');
			},

			'in': function() {
				assert.deepEqual(createFilter<SimpleObj>().in('key', [7, 4]).apply(simpleList),
					simpleList.slice(1), 'In with string path');
			},

			'contains': function() {
				assert.deepEqual(createFilter<NestedObj>().contains('key', 'key2').apply(nestedList),
					nestedList, 'Contains with string path');

				assert.deepEqual(createFilter<NestedObj>().contains('key', 'key1').apply(nestedList),
					[], 'Contains with string path');

				assert.deepEqual(createFilter<ListWithLists>().contains('list', 4).apply(listWithLists),
					listWithLists.slice(1), 'Contains with string path');
			},

			'equalTo': function() {
				assert.deepEqual(createFilter<SimpleObj>().equalTo('key', 5).apply(simpleList),
					[ { key: 5, id: '1' } ], 'Equal to with string path');
			},

			'notEqualTo': function() {
				assert.deepEqual(createFilter<SimpleObj>().notEqualTo('key', 5).apply(simpleList),
					[ { key: 7, id: '2' }, { key: 4, id: '3' } ], 'Not equal to with string path');
			},

			'deepEqualTo': function() {
				assert.deepEqual(createFilter<NestedObj>().deepEqualTo('key', { key2: 5 }).apply(nestedList),
					[ nestedList[0] ], 'Deep equal with string path');
			},

			'notDeepEqualTo': function() {
				assert.deepEqual(createFilter<NestedObj>().notDeepEqualTo('key', { key2: 5 }).apply(nestedList),
					nestedList.slice(1), 'Not deep equal with string path')	;
			},
			'filterChain should keep all filters': function() {
				const filters = createFilter<SimpleObj>().lessThan('key', 5).greaterThan('key', 10).filterChain;
				assert.lengthOf(filters, 3);
				assert.strictEqual(filters[1], BooleanOp.And);
			},
			'SimpleFilter should have an apply that can be used individually.': function() {
				const filters = createFilter<SimpleObj>().lessThan('key', 5).filterChain;
				const simpleFilter = <SimpleFilter<SimpleObj>> filters[0];

				assert.deepEqual(simpleFilter.apply(simpleList), [ { key: 4, id: '3' } ]);
			}
		},

		'with json path': {
			'less than': function() {
				assert.deepEqual(createFilter<NestedObj>().lessThan(createPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 4 }, id: '3' } ], 'Less than with JSON path');
			},

			'less than or equal to': function() {
				assert.deepEqual(createFilter<NestedObj>().lessThanOrEqualTo(createPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 5 }, id: '1' }, { key: { key2: 4 }, id: '3' } ], 'Less than or equal to with JSON path');
			},

			'greater than': function() {
				assert.deepEqual(createFilter<NestedObj>().greaterThan(createPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 7 }, id: '2' } ], 'Greater than with JSON path');
			},

			'greater than or equal to': function() {
				assert.deepEqual(createFilter<NestedObj>().greaterThanOrEqualTo(createPointer('key', 'key2'), 5).apply(nestedList),
				[ { key: { key2: 5 }, id: '1' }, { key: { key2: 7 }, id: '2' }], 'Greater than or equal to with JSON path');
			},

			'matches': function() {
				assert.deepEqual(createFilter<NestedObj>().matches(createPointer('id'), /[12]/).apply(nestedList),
				[ { key: { key2: 5 }, id: '1' }, { key: { key2: 7 }, id: '2' } ], 'Matches with JSON path');
			},

			'in': function() {
				assert.deepEqual(createFilter<NestedObj>().in(createPointer('key', 'key2'), [7, 4]).apply(nestedList),
					nestedList.slice(1), 'In with JSON path');
			},

			'contains': function() {
				assert.deepEqual(createFilter<NestedObj>().contains(createPointer('key'), 'key2').apply(nestedList),
					nestedList, 'Contains with JSON path');

				assert.deepEqual(createFilter<NestedObj>().contains(createPointer('key'), 'key1').apply(nestedList),
					[], 'Contains with JSON path');
			},

			'equalTo': function() {
				assert.deepEqual(createFilter<NestedObj>().equalTo(createPointer('key', 'key2'), 5).apply(nestedList),
					[{key: { key2: 5 }, id: '1'}], 'Equal to with json path');
			},

			'notEqualTo': function() {
				assert.deepEqual(createFilter<NestedObj>().notEqualTo(createPointer('key', 'key2'), 5).apply(nestedList),
					[ { key: { key2: 7 }, id: '2' }, { key: { key2: 4 }, id: '3' } ], 'Not equal to with json path');
			},

			'deepEqualTo': function() {
				assert.deepEqual(createFilter<NestedObj>().deepEqualTo(createPointer('key', 'key2'), 5).apply(nestedList),
					[ nestedList[0] ], 'Deep equal with JSON path');
			},

			'notDeepEqualTo': function() {
				assert.deepEqual(createFilter<NestedObj>().notDeepEqualTo(createPointer('key', 'key2'), 5).apply(nestedList),
					nestedList.slice(1), 'Not deep equal with JSON path');
			}
		},

		'custom'() {
			assert.deepEqual(createFilter<SimpleObj>().custom((item: SimpleObj) => item.key === 4 ).apply(simpleList),
					[ { key: 4, id: '3' } ], 'Not deep equal with custom filter');
		}
	},

	'compound filters': {
		'chained': {
			'automatic chaining': function() {
				assert.deepEqual(createFilter<SimpleObj>().lessThanOrEqualTo('key', 5).equalTo('id', '1').apply(simpleList),
					[ simpleList[0] ], 'Sequential filters chain ands automatically');
			},

			'explicit chaining \'and\'': function() {
				assert.deepEqual(createFilter<SimpleObj>().lessThanOrEqualTo('key', 5).and().equalTo('id', '1').apply(simpleList),
					[ simpleList[0] ], 'Chaining filters with and explicitly');
			},

			'explicit chaining \'or\'': function() {
				assert.deepEqual(createFilter<SimpleObj>().lessThan('key', 5).or().greaterThan('key', 5).apply(simpleList),
					simpleList.slice(1), 'Chaining filters with or explicitly');
			},

			'combining \'and\' and \'or\'': function() {
				assert.deepEqual(createFilter<SimpleObj>()
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
			const pickFirstItem = createFilter<NestedObj>()
				.lessThanOrEqualTo(createPointer('key', 'key2'), 5)
				.and()
				.equalTo('id', '1')
				.or()
				.greaterThanOrEqualTo(createPointer('key', 'key2'), 5)
				.equalTo('id', '1')
				.or()
				.greaterThan(createPointer('key', 'key2'), 5)
				.equalTo('id', '1');
			const pickAllItems = createFilter<NestedObj>().lessThan(createPointer('key', 'key2'), 100);
			const pickNoItems = createFilter<NestedObj>().greaterThan(createPointer('key', 'key2'), 100);

			const pickLastItem = createFilter<NestedObj>().equalTo('id', '3');

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

	'serializing': {
		'simple - no path': {
			'empty filter': function() {
				assert.strictEqual(createFilter().toString(), '', 'Didn\'t properly serialize empty filter');
			},

			'less than': function() {
				assert.strictEqual(createFilter().lessThan('key', 3).toString(), 'lt(key, 3)',
					'Didn\'t properly serialize less than');
			},

			'greater than': function() {
				assert.strictEqual(createFilter().greaterThan('key', 3).toString(), 'gt(key, 3)',
					'Didn\'t properly serialize greater than');
			},

			'equals': function() {
				assert.strictEqual(createFilter().equalTo('key', 'value').toString(), 'eq(key, "value")',
					'Didn\'t properly serialize equals');
			},

			'deep equals': function() {
				assert.strictEqual(createFilter().deepEqualTo('key', 'value').toString(), 'eq(key, "value")',
					'Didn\'t properly serialize deep equals');
			},

			'in': function() {
				assert.strictEqual(createFilter().in('key', [1, 2, 3]).toString(), 'in(key, [1,2,3])',
					'Didn\'t properly serialize in');
			},

			'contains': function() {
				assert.strictEqual(createFilter().contains('key', 'value').toString(), 'contains(key, "value")',
					'Didn\'t properly serialize contains');
			},

			'not equal': function() {
				assert.strictEqual(createFilter().notEqualTo('key', 'value').toString(), 'ne(key, "value")',
					'Didn\'t properly serialize not equal');
			},

			'not deep equal': function() {
				assert.strictEqual(createFilter().notDeepEqualTo('key', 'value').toString(), 'ne(key, "value")',
					'Didn\'t properly serialize not deep equal');
			},

			'less than or equal to': function() {
				assert.strictEqual(createFilter().lessThanOrEqualTo('key', 3).toString(), 'lte(key, 3)',
					'Didn\'t properly serialize less than or equal to');
			},

			'greater than or equal to': function() {
				assert.strictEqual(createFilter().greaterThanOrEqualTo('key', 3).toString(), 'gte(key, 3)',
					'Didn\'t properly serialize greater than or equal to');
			},

			'matches': function() {
				assert.throws(() => (createFilter().matches('key', /test/).toString()), 'Cannot parse this filter type to an RQL query string');
			},

			'custom': function() {
				assert.throws(() => (createFilter<any>().custom((arg: any) => true).toString()), 'Cannot parse this filter type to an RQL query string');
			}
		},

		'simple - path': {
			'less than': function() {
				assert.strictEqual(createFilter().lessThan(createPointer('key', 'key2'), 3).toString(),
					'lt(key/key2, 3)', 'Didn\'t properly serialize less than');
			},

			'greater than': function() {
				assert.strictEqual(createFilter().greaterThan(createPointer('key', 'key2'), 3).toString(),
					'gt(key/key2, 3)', 'Didn\'t properly serialize greater than');
			},

			'equals': function() {
				assert.strictEqual(createFilter().equalTo(createPointer('key', 'key2'), 'value').toString(),
					'eq(key/key2, "value")', 'Didn\'t properly serialize equals');
			},

			'deep equals': function() {
				assert.strictEqual(createFilter().deepEqualTo(createPointer('key', 'key2'), 'value').toString(),
					'eq(key/key2, "value")', 'Didn\'t properly serialize deep equals');
			},

			'in': function() {
				assert.strictEqual(createFilter().in(createPointer('key', 'key2'), [ 1, 2, 3 ]).toString(),
					'in(key/key2, [1,2,3])', 'Didn\'t properly serialize in');
			},

			'contains': function() {
				assert.strictEqual(createFilter().contains(createPointer('key', 'key2'), 'value').toString(),
					'contains(key/key2, "value")', 'Didn\'t properly serialize contains');
			},

			'not equal': function() {
				assert.strictEqual(createFilter().notEqualTo(createPointer('key', 'key2'), 'value').toString(),
					'ne(key/key2, "value")', 'Didn\'t properly serialize not equal');
			},

			'not deep equal': function() {
				assert.strictEqual(createFilter().notDeepEqualTo(createPointer('key', 'key2'), 'value').toString(),
					'ne(key/key2, "value")', 'Didn\'t properly serialize not deep equal');
			},

			'less than or equal to': function() {
				assert.strictEqual(createFilter().lessThanOrEqualTo(createPointer('key', 'key2'), 3).toString(),
					'lte(key/key2, 3)', 'Didn\'t properly serialize less than or equal to');
			},

			'greater than or equal to': function() {
				assert.strictEqual(createFilter().greaterThanOrEqualTo(createPointer('key', 'key2'), 3).toString(),
					'gte(key/key2, 3)', 'Didn\'t properly serialize greater than or equal to');
			},

			'matches': function() {
				assert.throws(() => (createFilter().matches(createPointer('key', 'key2'), /test/).toString()), 'Cannot parse this filter type to an RQL query string');
			}
		},

		'chained': {
			'ands': function() {
				assert.strictEqual(createFilter().greaterThan('key', 3).lessThan('key', 2).in('key', [ 3 ]).toString(),
					'gt(key, 3)&lt(key, 2)&in(key, [3])', 'Didn\'t properly chain filter with ands');
			},

			'ors': function() {
				assert.strictEqual(createFilter().greaterThan('key', 3).or().lessThan('key', 2).or().in('key', [ 3 ]).toString(),
					'gt(key, 3)|lt(key, 2)|in(key, [3])', 'Didn\'t properly chain filter with ors');
			},

			'combination': function() {
				assert.strictEqual(createFilter().greaterThan('key', 3).lessThan('key', 3).or().in('key', [ 3 ]).toString(),
					'gt(key, 3)&lt(key, 3)|in(key, [3])', 'Didn\'t properly chain filter with ands and ors');
			}
		},

		'nested': function() {
			const filterOne = createFilter().greaterThan('key', 3).lessThan('key', 2).in('key', [ 3 ]);
			const filterTwo = createFilter().greaterThan('key', 3).or().lessThan('key', 2).in('key', [ 3 ]);
			const filterThree = createFilter().greaterThan('key', 3).or().lessThan('key', 2).or().in('key', [ 3 ]);

			const compoundFilter = createFilter()
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

	'provide custom serialization approach': function() {
		function serializeFilter(filter: Filter<any>): string {
			function recursivelySerialize(filter: Filter<any>): string {
				switch (filter.filterType) {
					case FilterType.LessThan:
						return filter.path.toString() + ' is less than ' + (filter.value || '');
					case FilterType.GreaterThan:
						return filter.path.toString() + ' is greater than ' + (filter.value || '');
					case FilterType.EqualTo:
						return filter.path.toString() + ' is equal to ' + (filter.value || '');
					case FilterType.Compound:
						return filter.filterChain.reduce((prev, next) => {
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

		assert.strictEqual(createFilter(serializeFilter)
			.greaterThan('key', 3)
			.lessThan('key', 5)
			.or()
			.equalTo('id', 'value')
			.toString(),
			'Return any item where key is greater than 3 and key is less than 5 or id is equal to value',
			'Didn\'t use provided serialization function'
		);
	}
});
