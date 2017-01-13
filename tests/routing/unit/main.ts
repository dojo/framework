import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

import * as main from '../../src/main';
import createRoute from '../../src/createRoute';
import createRouter from '../../src/createRouter';
import createHashHistory from '../../src/history/createHashHistory';
import createMemoryHistory from '../../src/history/createMemoryHistory';
import createStateHistory from '../../src/history/createStateHistory';

registerSuite({
	name: 'main',

	'#createRoute': {
		'is the same as @dojo/routing/createRoute'() {
			assert.strictEqual(main.createRoute, createRoute);
		}
	},

	'#createRouter': {
		'is the same as @dojo/routing/createRouter'() {
			assert.strictEqual(main.createRouter, createRouter);
		}
	},

	'#history.createHashHistory': {
		'is the same as @dojo/routing/history/createHashHistory'() {
			assert.strictEqual(main.history.createHashHistory, createHashHistory);
		}
	},

	'#history.createMemoryHistory': {
		'is the same as @dojo/routing/history/createMemoryHistory'() {
			assert.strictEqual(main.history.createMemoryHistory, createMemoryHistory);
		}
	},

	'#history.createStateHistory': {
		'is the same as @dojo/routing/history/createStateHistory'() {
			assert.strictEqual(main.history.createStateHistory, createStateHistory);
		}
	}
});
