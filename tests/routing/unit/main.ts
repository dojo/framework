const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

import * as main from '../../src/main';
import Route from '../../src/Route';
import Router from '../../src/Router';
import HashHistory from '../../src/history/HashHistory';
import MemoryHistory from '../../src/history/MemoryHistory';
import StateHistory from '../../src/history/StateHistory';

suite('main', () => {

	test('#createRoute is the same as @dojo/routing/createRoute', () => {
		assert.strictEqual(main.Route, Route);
	});

	test('#createRouter is the same as @dojo/routing/createRouter', () => {
		assert.strictEqual(main.Router, Router);
	});

	test('#history.createHashHistory is the same as @dojo/routing/history/createHashHistory', () => {
		assert.strictEqual(main.history.HashHistory, HashHistory);
	});

	test('#history.createMemoryHistory is the same as @dojo/routing/history/createMemoryHistory', () => {
		assert.strictEqual(main.history.MemoryHistory, MemoryHistory);
	});

	test('#history.createStateHistory is the same as @dojo/routing/history/createStateHistory', () => {
		assert.strictEqual(main.history.StateHistory, StateHistory);
	});
});
