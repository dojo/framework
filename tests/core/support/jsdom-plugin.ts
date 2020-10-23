import global from '../../../src/shim/global';
import { TddSuiteFactory } from 'intern/lib/interfaces/tdd';
import { ObjectSuiteDescriptor, ObjectSuiteFactory, Tests } from 'intern/lib/interfaces/object';

declare module 'intern/lib/executors/Node' {
	interface NodeExecutor {
		getPlugin(
			plugin: 'jsdom'
		): {
			describe(name: string, factory: TddSuiteFactory): void;
			registerSuite(name: string, descriptorOrFactory: ObjectSuiteDescriptor | ObjectSuiteFactory | Tests): void;
			suite(name: string, factory: TddSuiteFactory): void;
		};
	}
}

intern.registerPlugin('jsdom', async () => {
	const { suite: tddSuite, before, after } = intern.getInterface('tdd');
	const { describe: bddDescribe } = intern.getInterface('bdd');
	const { registerSuite: objectRegisterSuite } = intern.getInterface('object');

	if (global.document && global.window) {
		return {
			describe: tddSuite,
			suite: bddDescribe,
			registerSuite: objectRegisterSuite
		};
	}

	const jsdom = await import('jsdom');

	/* In order to have the tests work under Node.js, we need to load JSDom and polyfill
	 * requestAnimationFrame and create a fake document.activeElement getter */
	const initialize = () => {
		/* Create a basic document */
		const doc = new jsdom.JSDOM(`
			<!DOCTYPE html>
			<html>
			<head></head>
			<body></body>
			<html>
		`);

		/* Assign it to the global namespace */
		global.document = doc.window.document;

		/* Assign a global window as well */
		global.window = doc.window;

		/* Needed for Pointer Event Polyfill's incorrect Element detection */
		global.Element = function() {};

		/* Polyfill requestAnimationFrame - this can never be called an *actual* polyfill */
		global.requestAnimationFrame = (cb: (...args: any[]) => {}) => {
			setImmediate(cb);
			// return something at least!
			return true;
		};

		global.MutationObserver = function MutationObserver() {
			return {
				observe: function() {
					return [];
				},
				takeRecords: function() {
					return [];
				}
			};
		};
		global.cancelAnimationFrame = () => {};
		global.IntersectionObserver = () => {};

		if (!global.navigator) {
			global.navigator = {
				language: 'en-GB'
			};
		}

		global.fakeActiveElement = () => {};
		Object.defineProperty(global.document, 'activeElement', {
			get: () => {
				return global.fakeActiveElement();
			}
		});
	};
	initialize();

	const uninitialize = () => {
		global.document = global.window = global.Element = global.requestAnimationFrame = global.cancelAnimationFrame = global.IntersectionObserver = global.fakeActiveElement = undefined;
	};

	function isSuiteDescriptor(object: any): object is ObjectSuiteDescriptor {
		return typeof object['tests'] !== 'undefined';
	}

	function isSuiteFactory(object: any): object is ObjectSuiteFactory {
		return typeof object === 'function';
	}

	return {
		describe(name: string, factory: TddSuiteFactory) {
			bddDescribe(name, (suite) => {
				before(initialize);
				after(uninitialize);

				factory(suite);
			});
		},
		suite(name: string, factory: TddSuiteFactory) {
			tddSuite(name, (suite) => {
				before(initialize);
				after(uninitialize);

				factory(suite);
			});
		},
		registerSuite(name: string, descriptorOrFactory: ObjectSuiteDescriptor | ObjectSuiteFactory | Tests) {
			objectRegisterSuite(name, () => {
				let descriptor: ObjectSuiteDescriptor | Tests;

				if (isSuiteFactory(descriptorOrFactory)) {
					descriptor = descriptorOrFactory();
				} else {
					descriptor = descriptorOrFactory;
				}

				if (isSuiteDescriptor(descriptor)) {
					if (descriptor['before'] !== undefined) {
						const oldBefore = descriptor['before'];
						descriptor['before'] = (suite) => {
							initialize();
							return oldBefore!.call(suite, suite);
						};
					} else {
						descriptor['before'] = initialize;
					}
					if (descriptor['after'] !== undefined) {
						const oldAfter = descriptor['after'];
						descriptor['after'] = (suite) => {
							uninitialize();
							return oldAfter!.call(suite, suite);
						};
					} else {
						descriptor['after'] = uninitialize;
					}
				} else {
					descriptor = {
						before: initialize,
						after: uninitialize,
						tests: descriptor
					};
				}

				return descriptor;
			});
		}
	};
});
