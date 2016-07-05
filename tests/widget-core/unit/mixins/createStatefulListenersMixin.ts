import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Actionable, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import Promise from 'dojo-core/Promise';
import createStatefulListenersMixin from 'src/mixins/createStatefulListenersMixin';
import { RegistryProvider } from 'src/mixins/interfaces';

type Action = Actionable<TargettedEventObject>;

interface ActionStub extends Action {
	callCount: number;
	reset(): void;
}

function createAction(): ActionStub {
	return {
		callCount: 0,
		do(options) {
			this.callCount++;
		},
		reset() {
			this.callCount = 0;
		}
	};
}

const action1 = createAction();
const action2 = createAction();
const action3 = createAction();
const action4 = createAction();

const actionMap: { [id: string]: ActionStub } = {
	action1,
	action2,
	action3,
	action4
};

const actionRegistry = {
	getCalls: <(string | symbol)[]> [],
	get(id: string | symbol): Promise<Action> {
		this.getCalls.push(id);
		return Promise.resolve(actionMap[id]);
	},
	identify(value: Action): string | symbol {
		switch (value) {
			case action1:
				return 'action1';
			case action2:
				return 'action2';
			case action3:
				return 'action3';
			case action4:
				return 'action4';
			default:
				return undefined;
		}
	}
};

const registryProvider: RegistryProvider<Action> = {
	get(type: string) {
		return type === 'actions' ? actionRegistry : null;
	}
};

function delay() {
	return new Promise((resolve) => setTimeout(resolve, 50));
}

registerSuite({
	name: 'mixins/createStatefulListenersMixin',
	beforeEach() {
		actionRegistry.getCalls = [];
		action1.reset();
		action2.reset();
		action3.reset();
		action4.reset();
	},
	creation: {
		'with registry'() {
			const widget = createStatefulListenersMixin({
				registryProvider,
				state: {
					listeners: {
						foo: 'action1',
						bar: ['action2']
					}
				}
			});

			return delay().then(() => {
				widget.emit({ type: 'foo' });
				widget.emit({ type: 'bar' });
				assert.equal(action1.callCount, 1);
				assert.equal(action2.callCount, 1);
			});
		},
		'without registry'() {
			const widget = createStatefulListenersMixin({});

			return delay().then(() => {
				widget.emit({ type: 'foo' });
				widget.emit({ type: 'bar' });
				assert.equal(action1.callCount, 0);
				assert.equal(action2.callCount, 0);
			});
		},
		'without options'() {
			const widget = createStatefulListenersMixin();

			return delay().then(() => {
				widget.emit({ type: 'foo' });
				widget.emit({ type: 'bar' });
				assert.equal(action1.callCount, 0);
				assert.equal(action2.callCount, 0);
			});
		}
	},
	setState() {
		const widget = createStatefulListenersMixin({
			registryProvider,
			state: {
				listeners: {
					foo: 'action1'
				}
			}
		});

		return delay().then(() => {
			widget.emit({ type: 'foo' });
			widget.setState({
				listeners: {
					foo: 'action1',
					bar: ['action2']
				}
			});

			return delay();
		}).then(() => {
			widget.emit({ type: 'foo' });
			widget.emit({ type: 'bar' });
			assert.equal(action1.callCount, 2);
			assert.equal(action2.callCount, 1);

			widget.setState({
				listeners: {
					foo: undefined,
					bar: ['action2', 'action3']
				}
			});

			return delay();
		}).then(() => {
			widget.emit({ type: 'foo' });
			widget.emit({ type: 'bar' });
			assert.equal(action1.callCount, 2);
			assert.equal(action2.callCount, 2);
			assert.equal(action3.callCount, 1);

			widget.setState({
				listeners: undefined
			});

			return delay();
		}).then(() => {
			widget.emit({ type: 'foo' });
			widget.emit({ type: 'bar' });
			assert.equal(action1.callCount, 2);
			assert.equal(action2.callCount, 2);
			assert.equal(action3.callCount, 1);
		});
	},
	'caches actions'() {
		const widget = createStatefulListenersMixin({
			registryProvider,
			state: {
				listeners: {
					foo: 'action1'
				}
			}
		});

		return delay().then(() => {
			widget.setState({
				listeners: {
					foo: ['action1'],
					bar: ['action2']
				}
			});

			return delay();
		}).then(() => {
			assert.deepEqual(actionRegistry.getCalls, ['action1', 'action2']);
		});
	},
	destroy() {
		const widget = createStatefulListenersMixin({
			registryProvider,
			state: {
				listeners: {
					foo: 'action1'
				}
			}
		});

		return delay().then(() => {
			assert.doesNotThrow(() => {
				widget.destroy();
			});
		});
	},
	'emits error if registry rejects get()'() {
		let rejectingRegistry = Object.create(actionRegistry);
		const expected = new Error();
		rejectingRegistry.get = () => Promise.reject(expected);

		const dfd = this.async();

		const widget = createStatefulListenersMixin({
			registryProvider: {
				get(type: string) {
					return type === 'actions' ? rejectingRegistry : null;
				}
			},
			state: {
				listeners: {
					foo: 'action1'
				}
			}
		});

		widget.on('error', dfd.callback((evt: any) => {
			assert.strictEqual(evt.target, widget);
			assert.strictEqual(evt.error, expected);
		}));
	},
	'latest state determines the listeners'() {
		const { get } = actionRegistry;
		let registry = Object.create(actionRegistry);

		const widget = createStatefulListenersMixin({
			registryProvider: {
				get(type: string) {
					return type === 'actions' ? registry : null;
				}
			},
			state: {
				listeners: {
					foo: 'action1'
				}
			}
		});

		let resolveFirst: () => void;
		let resolveSecond: () => void;
		return delay().then(() => {
			registry.get = (id: string) => {
				return new Promise((resolve) => {
					const first = get.call(registry, id);
					resolveFirst = () => resolve(first);
				});
			};

			widget.setState({
				listeners: {
					foo: 'action2'
				}
			});

			assert.ok(resolveFirst);
		}).then(() => {
			registry.get = (id: string) => {
				return new Promise((resolve) => {
					const second = get.call(registry, id);
					resolveSecond = () => resolve(second);
				});
			};

			widget.setState({
				listeners: {
					foo: 'action3'
				}
			});

			assert.ok(resolveSecond);
			resolveSecond();

			return delay();
		}).then(() => {
			widget.emit({ type: 'foo' });
			assert.equal(action2.callCount, 0);
			assert.equal(action3.callCount, 1);

			resolveFirst();
			return delay();
		}).then(() => {
			widget.emit({ type: 'foo' });
			assert.equal(action2.callCount, 0);
			assert.equal(action3.callCount, 2);
		});
	}
});
