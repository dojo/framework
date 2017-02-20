import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import * as main from '../../src/main';
import Route from '../../src/Route';
import Router from '../../src/Router';
import HashHistory from '../../src/history/HashHistory';
import MemoryHistory from '../../src/history/MemoryHistory';
import StateHistory from '../../src/history/StateHistory';

registerSuite({
	name: 'main',

	'#createRoute': {
		'is the same as @dojo/routing/createRoute'() {
			assert.strictEqual(main.Route, Route);
		}
	},

	'#createRouter': {
		'is the same as @dojo/routing/createRouter'() {
			assert.strictEqual(main.Router, Router);
		}
	},

	'#history.createHashHistory': {
		'is the same as @dojo/routing/history/createHashHistory'() {
			assert.strictEqual(main.history.HashHistory, HashHistory);
		}
	},

	'#history.createMemoryHistory': {
		'is the same as @dojo/routing/history/createMemoryHistory'() {
			assert.strictEqual(main.history.MemoryHistory, MemoryHistory);
		}
	},

	'#history.createStateHistory': {
		'is the same as @dojo/routing/history/createStateHistory'() {
			assert.strictEqual(main.history.StateHistory, StateHistory);
		}
	}
});
