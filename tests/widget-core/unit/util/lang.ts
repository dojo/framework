import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { insertInList, insertInArray } from 'src/util/lang';
import { List } from 'immutable/immutable';

registerSuite({
	name: 'util/lang',
	'insertInList()': {
		'position "before"'() {
			const first = {};
			const last = {};
			const list = List([ first, last ]);
			const item = {};
			const result = insertInList(list, item, 'before', last);
			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get(0), first);
			assert.strictEqual(result.get(1), item);
			assert.strictEqual(result.get(2), last);
		},
		'position "after"'() {
			const first = {};
			const last = {};
			const list = List([ first, last ]);
			const item = {};
			const result = insertInList(list, item, 'after', first);
			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get(0), first);
			assert.strictEqual(result.get(1), item);
			assert.strictEqual(result.get(2), last);
		},
		'position "last"'() {
			const first = {};
			const last = {};
			const list = List([ first, last ]);
			const item = {};
			const result = insertInList(list, item, 'last');
			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get(0), first);
			assert.strictEqual(result.get(1), last);
			assert.strictEqual(result.get(2), item);
		},
		'position "first"'() {
			const first = {};
			const last = {};
			const list = List([ first, last ]);
			const item = {};
			const result = insertInList(list, item, 'first');
			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get(0), item);
			assert.strictEqual(result.get(1), first);
			assert.strictEqual(result.get(2), last);
		},
		'position number'() {
			const first = {};
			const last = {};
			const list = List([ first, last ]);
			const item = {};
			const result = insertInList(list, item, 1);
			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get(0), first);
			assert.strictEqual(result.get(1), item);
			assert.strictEqual(result.get(2), last);
		},
		'throws': {
			'invalid position'() {
				assert.throws(() => {
					insertInList(List(), {}, <any> undefined);
				}, Error);
			},
			'invalid before reference'() {
				assert.throws(() => {
					insertInList(List(), {}, 'before', {});
				}, Error);
			},
			'invalid after reference'() {
				assert.throws(() => {
					insertInList(List(), {}, 'after', {});
				}, Error);
			},
			'invalid number position'() {
				assert.throws(() => {
					insertInList(List(), {}, -1);
				}, Error);
				assert.throws(() => {
					insertInList(List(), {}, 2);
				}, Error);
				assert.throws(() => {
					insertInList(List(), {}, Infinity);
				}, Error);
			}
		}
	},
	'insertInArray()': {
		'position "before"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'before', last);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "after"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'after', first);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "first"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'first');
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], item);
			assert.strictEqual(result[1], first);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'position "last"'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 'last');
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], last);
			assert.strictEqual(result[2], item);
			assert.strictEqual(list, result);
		},
		'position number'() {
			const first = {};
			const last = {};
			const list = [ first, last ];
			const item = {};
			const result = insertInArray(list, item, 1);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0], first);
			assert.strictEqual(result[1], item);
			assert.strictEqual(result[2], last);
			assert.strictEqual(list, result);
		},
		'throws': {
			'invalid position'() {
				assert.throws(() => {
					insertInArray([], {}, <any> undefined);
				}, Error);
			},
			'invalid before reference'() {
				assert.throws(() => {
					insertInArray([], {}, 'before', {});
				}, Error);
			},
			'invalid after reference'() {
				assert.throws(() => {
					insertInArray([], {}, 'after', {});
				}, Error);
			},
			'invalid number position'() {
				assert.throws(() => {
					insertInArray([], {}, -1);
				}, Error);
				assert.throws(() => {
					insertInArray([], {}, 2);
				}, Error);
				assert.throws(() => {
					insertInArray([], {}, Infinity);
				}, Error);
			}
		}
	}
});
