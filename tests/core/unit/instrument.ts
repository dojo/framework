const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { hasClassName } from '../support/util';
import { spy, SinonSpy } from 'sinon';
import {
	deprecated,
	deprecatedAdvice,
	deprecatedDecorator,
	setWarn
} from '../../src/instrument';

let consoleWarnSpy: SinonSpy;

registerSuite('instrument', {
	beforeEach() {
		consoleWarnSpy = spy(console, 'warn');
	},

	afterEach() {
		(<any> console.warn).restore && (<any> console.warn).restore();
	},

	tests: {
		'deprecated()': {
			'no options'(this: any) {
				deprecated();
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				assert.strictEqual(consoleWarnSpy.lastCall.args[0], 'DEPRECATED: This function will be removed in future versions.');
			},

			'message in options'(this: any) {
				const message = 'foo';
				deprecated({ message });
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				assert.strictEqual(consoleWarnSpy.lastCall.args[0], `DEPRECATED: ${message}`);
			},

			'name in options'(this: any) {
				const name = 'foo';
				deprecated({ name });
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				assert.strictEqual(consoleWarnSpy.lastCall.args[0], `DEPRECATED: ${name}: This function will be removed in future versions.`);
			},

			'url in options'(this: any) {
				const url = 'foo';
				deprecated({ url });
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				assert.strictEqual(consoleWarnSpy.lastCall.args[0], `DEPRECATED: This function will be removed in future versions.\n\n    See ${url} for more details.\n\n`);
			},

			'warn in options'() {
				const callStack: any[][] = [];

				function warn(...args: any[]): void {
					callStack.push(args);
				}

				deprecated({ warn });
				assert.isTrue(consoleWarnSpy.notCalled);
				assert.strictEqual(callStack.length, 1);
				assert.strictEqual(callStack[0].length, 1);
				assert.strictEqual(callStack[0][0], 'DEPRECATED: This function will be removed in future versions.');
			}
		},

		'deprecatedAdvice()': {
			'no options'(this: any) {
				const advice = deprecatedAdvice();
				assert.isTrue(consoleWarnSpy.notCalled);

				const args: any[] = [ 'foo' ];
				const result = advice.apply(null, args);
				assert.deepEqual(args, result);
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				assert.strictEqual(consoleWarnSpy.lastCall.args[0], 'DEPRECATED: This function will be removed in future versions.');
			},

			'warn in options'() {
				const callStack: any[][] = [];

				function warn(...args: any[]): void {
					callStack.push(args);
				}

				const advice = deprecatedAdvice({ warn });

				const args: any[] = [ 'foo' ];
				const result = advice.apply(null, args);
				assert.deepEqual(args, result);
				assert.isTrue(consoleWarnSpy.notCalled);
				assert.strictEqual(callStack.length, 1);
				assert.strictEqual(callStack[0].length, 1);
				assert.strictEqual(callStack[0][0], 'DEPRECATED: This function will be removed in future versions.');
			}
		},

		'deprecatedDecorator()': {
			'no options'(this: any) {
				const callStack: any[][] = [];

				class Foo {
					@deprecatedDecorator()
					method(...args: any[]) {
						callStack.push(args);
					}
				}

				const foo = new Foo();
				assert.isTrue(consoleWarnSpy.notCalled);
				foo.method('foo');
				assert.isTrue(consoleWarnSpy.calledOnce);
				assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
				if (hasClassName()) {
					assert.strictEqual(consoleWarnSpy.lastCall.args[0], 'DEPRECATED: Foo#method: This function will be removed in future versions.');
				}
				else {
					assert.strictEqual(consoleWarnSpy.lastCall.args[0], 'DEPRECATED: method: This function will be removed in future versions.');
				}
				assert.strictEqual(callStack[0].length, 1);
				assert.strictEqual(callStack[0][0], 'foo');
			},

			'warn in options'() {
				const callStack: any[][] = [];

				function warn(...args: any[]): void {
					callStack.push(args);
				}

				class Foo {
					@deprecatedDecorator({ warn })
					method() { }
				}

				const foo = new Foo();
				foo.method();
				assert.isTrue(consoleWarnSpy.notCalled);
				assert.strictEqual(callStack.length, 1);
				assert.strictEqual(callStack[0].length, 1);
				if (hasClassName()) {
					assert.strictEqual(callStack[0][0], 'DEPRECATED: Foo#method: This function will be removed in future versions.');
				}
				else {
					assert.strictEqual(callStack[0][0], 'DEPRECATED: method: This function will be removed in future versions.');
				}
			}
		},

		'setWarn()'() {
			const callStack: any[][] = [];

			function warn(...args: any[]): void {
				callStack.push(args);
			}

			setWarn(warn);
			deprecated();
			assert.isTrue(consoleWarnSpy.notCalled);
			assert.strictEqual(callStack.length, 1);
			assert.strictEqual(callStack[0].length, 1);
			assert.strictEqual(callStack[0][0], 'DEPRECATED: This function will be removed in future versions.');

			setWarn();
			deprecated();
			assert.isTrue(consoleWarnSpy.calledOnce);
			assert.strictEqual(callStack.length, 1);
			assert.strictEqual(consoleWarnSpy.lastCall.args.length, 1);
			assert.strictEqual(consoleWarnSpy.lastCall.args[0], 'DEPRECATED: This function will be removed in future versions.');
		}
	}
});
