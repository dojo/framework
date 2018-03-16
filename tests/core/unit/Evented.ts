const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { Evented, CustomEventTypes } from '../../src/Evented';
import { EventObject } from '../../src/interfaces';

interface FooBarEvents extends CustomEventTypes {
	foo: R;
	bar: R;
}

interface R extends EventObject<string> {
	value: number;
}

registerSuite('Evented', {
	creation() {
		const evented = new Evented();
		assert(evented);
		assert.isFunction(evented.on);
		assert.isFunction(evented.emit);
	},
	on: {
		'on()'() {
			const eventStack: string[] = [];
			const evented = new Evented<FooBarEvents>();
			const handle = evented.on('foo', (event) => {
				eventStack.push(event.type);
			});

			evented.emit<'foo'>({ type: 'foo', value: 1 });
			evented.emit({ type: 'bar' });

			handle.destroy();

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });

			assert.deepEqual(eventStack, ['foo']);
		},
		'on() with Symbol type'() {
			const foo = Symbol();
			const bar = Symbol();
			const eventStack: symbol[] = [];
			const evented = new Evented<{}, symbol>();
			const handle = evented.on(foo, (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: foo });
			evented.emit({ type: bar });
			evented.emit({ type: 'bar' });

			handle.destroy();

			evented.emit({ type: foo });
			evented.emit({ type: 'bar' });

			assert.deepEqual(eventStack, [foo]);
		},
		'multiple listeners, same event'() {
			const eventStack: string[] = [];
			const evented = new Evented<FooBarEvents>();

			const handle1 = evented.on('foo', () => {
				eventStack.push('one');
			});
			const handle2 = evented.on('foo', () => {
				eventStack.push('two');
			});

			evented.emit({ type: 'foo' });
			handle1.destroy();
			evented.emit({ type: 'foo' });
			handle2.destroy();
			evented.emit({ type: 'foo' });

			assert.deepEqual(eventStack, ['one', 'two', 'two']);
		},
		'on(type, listener[])'() {
			const eventStack: string[] = [];
			const evented = new Evented<FooBarEvents>();

			const handle = evented.on('foo', [
				function(event) {
					eventStack.push('foo1');
				},
				function(event) {
					eventStack.push('foo2');
				}
			]);

			evented.emit({ type: 'foo' });
			handle.destroy();
			evented.emit({ type: 'foo' });

			assert.deepEqual(eventStack, ['foo1', 'foo2']);
		}
	},
	'wildcards in event type name': {
		'all event types'() {
			const eventStack: string[] = [];
			const evented = new Evented<{}, string>();
			evented.on('*', (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'bar' });
			evented.emit({ type: 'foo:bar' });

			assert.deepEqual(eventStack, ['foo', 'bar', 'foo:bar']);
		},
		'event types starting with a pattern'() {
			const eventStack: string[] = [];
			const evented = new Evented<{}, string>();
			evented.on('foo:*', (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'foo:' });
			evented.emit({ type: 'foo:bar' });

			assert.deepEqual(eventStack, ['foo:', 'foo:bar']);
		},
		'event types ending with a pattern'() {
			const eventStack: string[] = [];
			const evented = new Evented<{}, string>();
			evented.on('*:bar', (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: 'bar' });
			evented.emit({ type: ':bar' });
			evented.emit({ type: 'foo:bar' });

			assert.deepEqual(eventStack, [':bar', 'foo:bar']);
		},
		'event types contains a pattern'() {
			const eventStack: string[] = [];
			const evented = new Evented<{}, string>();
			evented.on('*foo*', (event) => {
				eventStack.push(event.type);
			});

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'foobar' });
			evented.emit({ type: 'barfoo' });
			evented.emit({ type: 'barfoobiz' });

			assert.deepEqual(eventStack, ['foo', 'foobar', 'barfoo', 'barfoobiz']);
		},
		'multiple matches'() {
			const eventStack: string[] = [];
			const evented = new Evented();
			evented.on('foo', (event) => {
				eventStack.push(`foo->${event.type}`);
			});
			evented.on('*foo', (event) => {
				eventStack.push(`*foo->${event.type}`);
			});

			evented.emit({ type: 'foo' });
			evented.emit({ type: 'foobar' });
			evented.emit({ type: 'barfoo' });

			assert.deepEqual(eventStack, ['foo->foo', '*foo->foo', '*foo->barfoo']);
		}
	}
});
