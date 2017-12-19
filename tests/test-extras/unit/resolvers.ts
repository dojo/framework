const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import global from '@dojo/shim/global';
import { createResolvers, Resolvers } from '../../src/resolvers';

let resolvers: Resolvers;

registerSuite('resolvers', {
	beforeEach() {
		resolvers = createResolvers();
	},

	afterEach() {
		resolvers && resolvers.restore();
	},

	tests: {
		'stub and restore'() {
			// Verify the global functions are not stubs.
			assert.isTrue(global.requestAnimationFrame.id == null);
			assert.isTrue((global.requestIdleCallback || global.setTimeout).id == null);

			resolvers.stub();
			// Verify the global functions are stubs.
			assert.isTrue(global.requestAnimationFrame.id != null);
			assert.isTrue((global.requestIdleCallback || global.setTimeout).id != null);

			resolvers.restore();
			// Verify the global functions are not stubs.
			assert.isTrue(global.requestAnimationFrame.id == null);
			assert.isTrue((global.requestIdleCallback || global.setTimeout).id == null);
		},

		'resolve requestAnimationFrame'() {
			const callback = stub();

			resolvers.stub();

			requestAnimationFrame(callback);
			assert.isFalse(callback.called);

			resolvers.resolve();
			assert.isTrue(callback.calledOnce);

			resolvers.restore();

			const dfd = this.async();
			setTimeout(
				dfd.callback(() => {
					assert.isTrue(callback.calledOnce);
				}),
				100
			);
		},

		'resolve idle callback'() {
			const callback = stub();

			resolvers.stub();

			(global.requestIdleCallback || global.setTimeout)(callback);
			assert.isFalse(callback.called);

			resolvers.resolve();
			assert.isTrue(callback.calledOnce);

			resolvers.restore();

			const dfd = this.async();
			setTimeout(
				dfd.callback(() => {
					assert.isTrue(callback.calledOnce);
				}),
				100
			);
		}
	}
});
