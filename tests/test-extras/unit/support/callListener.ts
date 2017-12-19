const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import callListener from '../../../src/support/callListener';

import { v, w } from '@dojo/widget-core/d';

registerSuite('support/callListener', {
	'should call listener'() {
		let count = 0;
		const vnode = w<any>('widget', {
			onClick(this: any, ...args: any[]) {
				count++;
				assert.isUndefined(this, 'should have called with undefined this');
				assert.lengthOf(args, 0, 'should have no arguments');
			}
		});
		callListener(vnode, 'onClick');
		assert.strictEqual(count, 1, 'should have called listener');
	},

	'should call based on bind'() {
		const bind = {};
		const vnode = w<any>('widget', {
			bind,
			onClick(this: any) {
				assert.strictEqual(this, bind, 'should have called with properties.bind');
			}
		});
		callListener(vnode, 'onClick');
	},

	'should call based on thisArg'() {
		const thisArg = {};
		const vnode = w<any>('widget', {
			bind: {},
			onClick(this: any) {
				assert.strictEqual(this, thisArg, 'should have called with thisArg');
			}
		});
		callListener(vnode, 'onClick', {
			thisArg
		});
	},

	'should pass args when specified'() {
		const args = [1, 2, 3];
		const vnode = w<any>('widget', {
			onClick(...calledArgs: any[]) {
				assert.deepEqual(calledArgs, args);
			}
		});
		callListener(vnode, 'onClick', {
			args
		});
	},

	'should target target when passed'() {
		let targetCount = 0;
		const target = w<any>('widget', {
			onClick() {
				targetCount++;
			}
		});
		let count = 0;
		const vnode = w<any>('widget', {
			onClick() {
				count++;
			}
		});
		callListener(vnode, 'onClick', {
			target
		});
		assert.strictEqual(targetCount, 1, 'should have called target');
		assert.strictEqual(count, 0, 'should not have called node');
	},

	'should target key when passed'() {
		let keyCount = 0;
		let count = 0;
		const vnode = w<any>(
			'widget',
			{
				onClick() {
					count++;
				}
			},
			[
				w<any>('sub-widget', {
					key: 'foo',
					onClick() {
						keyCount++;
					}
				}),
				w<any>('sub-widget', {
					key: 'bar',
					onClick() {
						count++;
					}
				})
			]
		);
		callListener(vnode, 'onClick', {
			key: 'foo'
		});
		assert.strictEqual(keyCount, 1, 'should have called key');
		assert.strictEqual(count, 0, 'should not have called other methods');
	},

	'should target when index is passed'() {
		let indexCount = 0;
		let count = 0;
		const vnode = v(
			'div',
			{
				onClick() {
					count++;
				}
			},
			[
				w<any>('sub-widget', {
					key: 'foo',
					onClick() {
						indexCount++;
					}
				}),
				w<any>('sub-widget', {
					key: 'bar',
					onClick() {
						count++;
					}
				})
			]
		);
		callListener(vnode, 'onClick', {
			index: 0
		});
		assert.strictEqual(indexCount, 1, 'should have called key');
		assert.strictEqual(count, 0, 'should not have called other methods');
	},

	'works on HNode'() {
		let count = 0;
		const vnode = v('div', {
			onclick() {
				count++;
			}
		});
		callListener(vnode, 'onclick');
		assert.strictEqual(count, 1, 'should have called listener');
	},

	'error conditions': {
		'method is not found'() {
			const vnode = w<any>('widget', { onClick() {} });
			assert.throws(
				() => {
					callListener(vnode, 'onFoo');
				},
				TypeError,
				'Cannot resolve listener: "onFoo"'
			);
		},

		'key is not found'() {
			const vnode = v('div', {}, [
				w<any>('sub-widget', { key: 'foo', onClick() {} }),
				w<any>('sub-widget', { key: 'bar', onClick() {} })
			]);
			assert.throws(
				() => {
					callListener(vnode, 'onClick', { key: 'baz' });
				},
				TypeError,
				'Cannot resolve target'
			);
		},

		'index is not found'() {
			const vnode = v('div', {}, [
				w<any>('sub-widget', { key: 'foo', onClick() {} }),
				w<any>('sub-widget', { key: 'bar', onClick() {} })
			]);
			assert.throws(
				() => {
					callListener(vnode, 'onClick', { index: 2 });
				},
				TypeError,
				'Cannot resolve target'
			);
		},

		'string is not supported'() {
			assert.throws(
				() => {
					callListener('testString', 'onclick');
				},
				TypeError,
				'Cannot resolve target'
			);
		}
	}
});
