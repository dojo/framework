import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createSort from '../../../src/query/createSort';
import createJsonPointer from '../../../src/patch/createJsonPointer';

type SimpleObj = { key1: string; id: number };
type NestedObj = { key1: { key2: string }; id: number};

function getSimpleList() {
	return [
		{
			key1: 'b',
			id: 1
		},
		{
			key1: 'c',
			id: 2
		},
		{
			key1: 'a',
			id: 3
		}
	];
};
const nestedList = [
	{
		key1: {
			key2: 'b'
		},
		id: 1
	},
	{
		key1: {
			key2: 'c'
		},
		id: 2
	},
	{
		key1: {
			key2: 'a'
		},
		id: 3
	}
];

registerSuite({
	name: 'sort',

	'sort with property': {
		'sort in default order': function() {
			assert.deepEqual(createSort<SimpleObj>('key1').apply(getSimpleList()),
				[ { key1: 'a', id: 3 }, { key1: 'b', id: 1 }, { key1: 'c', id: 2 } ]);
		},
		'sort in ascending order': function() {
			assert.deepEqual(createSort<SimpleObj>('key1', false).apply(getSimpleList()),
				[ { key1: 'a', id: 3 }, { key1: 'b', id: 1 }, { key1: 'c', id: 2 } ]);
		},
		'sort in decending order': function() {
			assert.deepEqual(createSort<SimpleObj>('key1', true).apply(getSimpleList()),
				[ { key1: 'c', id: 2 }, { key1: 'b', id: 1 }, { key1: 'a', id: 3 } ]);
		},

		'sort with same order': function() {
			const sameKeyList = getSimpleList().map( function({ id }) { return {
				id,
				key1: 'd'
			}; } );
			assert.deepEqual(createSort<SimpleObj>('key1', true).apply(sameKeyList),
				[ { key1: 'd', id: 1 }, { key1: 'd', id: 2 }, { key1: 'd', id: 3 } ]);
		},
		'sort with null property value': function() {
			const sameKeyList = getSimpleList().map( function({ id }) { return {
				id,
				key1: null
			}; } );
			assert.deepEqual(createSort<SimpleObj>('key1', true).apply(sameKeyList),
				[ { key1: null, id: 1 }, { key1: null, id: 2 }, { key1: null, id: 3 } ]);
		},
		'sort with partially null property value': function() {
			const list = [ { key1: null, id: 1 }, { key1: 'a', id: 2 }, { key1: null, id: 3 } ];
			assert.deepEqual(createSort<SimpleObj>('key1').apply(list),
				[ { key1: null, id: 1 }, { key1: null, id: 3 }, { key1: 'a', id: 2 } ]);
		},
		'sort with undefined property value': function() {
			const sameKeyList = getSimpleList().map( function({ id }) { return {
				id,
				key1: undefined
			}; } );
			assert.deepEqual(createSort<SimpleObj>('key1', true).apply(sameKeyList),
				[ { key1: undefined, id: 1 }, { key1: undefined, id: 2 }, { key1: undefined, id: 3 } ]);
		}
	},
	'sort with json path': {
		'sort with one path': function() {
			assert.deepEqual(createSort<SimpleObj>(createJsonPointer('key1')).apply(getSimpleList()),
				[ { key1: 'a', id: 3 }, { key1: 'b', id: 1 }, { key1: 'c', id: 2 } ]);
		},
		'sort with multiple paths': function() {
			assert.deepEqual(createSort<NestedObj>(createJsonPointer('key1', 'key2')).apply(nestedList),
				[ { key1: { key2: 'a' }, id: 3 }, { key1: { key2: 'b' }, id: 1 }, { key1: { key2: 'c' }, id: 2 } ]);
		}
	},
	'sort with comparator': {
		'sort with default order': function() {
			assert.deepEqual(createSort<SimpleObj>((a, b) => b.id - a.id).apply(getSimpleList()),
				[ { key1: 'a', id: 3 }, { key1: 'c', id: 2 }, { key1: 'b', id: 1 } ]);
		},
		'sort with flipped order': function() {
			assert.deepEqual(createSort<SimpleObj>((a, b) => b.id - a.id, true).apply(getSimpleList()),
				[ { key1: 'b', id: 1 }, { key1: 'c', id: 2 }, { key1: 'a', id: 3 } ]);
		}
	},
	'toString': {
		'Should print plus sign when sort order is ascending.'(this: any) {
			const result = createSort<SimpleObj>('key1').toString();
			assert.strictEqual(result, 'Sort(key1, +)');
		},
		'Should print minus sign when sort order is decending.'(this: any) {
			const result = createSort<SimpleObj>('key1', true).toString();
			assert.strictEqual(result, 'Sort(key1, -)');
		},
		'Should throw an error when toString is called on a comparator based sort.'(this: any) {
			const sort = createSort<SimpleObj>(function(a, b) { return 0; });
			assert.throws(function() {
				sort.toString();
			}, /Cannot parse this sort type to an RQL query string/);
		}
	}
});
