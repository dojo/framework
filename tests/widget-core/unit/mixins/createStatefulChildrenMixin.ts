import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStatefulChildrenMixin from 'src/mixins/createStatefulChildrenMixin';
import createRenderable, { Renderable } from 'src/mixins/createRenderable';
import Promise from 'dojo-core/Promise';
import { List, Map } from 'immutable/immutable';
import { Child } from 'src/mixins/interfaces';

const widget1 = createRenderable();
const widget2 = createRenderable();
const widget3 = createRenderable();
const widget4 = createRenderable();

const widgetMap: { [id: string]: Renderable } = {
	widget1,
	widget2,
	widget3,
	widget4
};

const widgetRegistry = {
	stack: <(string | symbol)[]> [],
	get(id: string | symbol): Promise<Renderable> {
		widgetRegistry.stack.push(id);
		return Promise.resolve(widgetMap[id]);
	},
	identify(value: Renderable): string | symbol {
		return value === widget1
			? 'widget1' : value === widget2
			? 'widget2' : value === widget3
			? 'widget3' : value === widget4
			? 'widget4' : undefined;
	}
};

const createStatefulChildrenList = createStatefulChildrenMixin
	.extend({
		children: List<Child>()
	});

const createStatefulChildrenMap = createStatefulChildrenMixin
	.extend({
		children: Map<string, Child>()
	});

function delay() {
	return new Promise((resolve) => setTimeout(resolve, 50));
}

registerSuite({
	name: 'mixins/createStatefulChildrenMixin',
	beforeEach() {
		widgetRegistry.stack = [];
	},
	'List children': {
		creation() {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				widgetRegistry,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.isTrue(List([ widget1 ]).equals(parent.children));
			}), 50);
		},
		setState() {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				widgetRegistry
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
				assert.isTrue(List([ widget2 ]).equals(parent.children));
			}), 50);
		},
		'caching widgets'() {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				widgetRegistry
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.isTrue(List([ widget1, widget2 ]).equals(parent.children));

					parent.setState({ children: [ 'widget2', 'widget1' ] });
					assert.isTrue(List([ widget2, widget1 ]).equals(parent.children), 'should synchronously update children when cached');
				}), 100);
			}, 100);
		},
		'childList'() {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				widgetRegistry
			});

			parent.emit({
				type: 'childlist',
				target: parent,
				children: List([ widget1, widget3 ])
			});

			setTimeout(() => {
				assert.deepEqual(parent.state.children, [ 'widget1', 'widget3' ]);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: List([ widget2, widget3 ])
				});
				setTimeout(dfd.callback(() => {
					assert.deepEqual(parent.state.children, [ 'widget2', 'widget3' ]);
				}), 50);
			}, 50);
		}
	},
	'Map children': {
		creation() {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				widgetRegistry,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.isTrue(Map({ widget1 }).equals(parent.children));
			}), 50);
		},
		setState() {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				widgetRegistry
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
				assert.isTrue(Map({ widget2 }).equals(parent.children));
			}), 50);
		},
		'caching widgets'() {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				widgetRegistry
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.isTrue(Map({ widget1, widget2 }).equals(parent.children));

					parent.setState({ children: [ 'widget2', 'widget1' ] });
					assert.isTrue(Map({ widget2, widget1 }).equals(parent.children), 'should synchronously update children when cached');
				}), 100);
			}, 100);
		},
		'childList'() {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				widgetRegistry
			});

			parent.emit({
				type: 'childlist',
				target: parent,
				children: Map({ widget1, widget3 })
			});

			setTimeout(() => {
				assert.deepEqual(parent.state.children, [ 'widget1', 'widget3' ]);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: Map({ widget2, widget3 })
				});
				setTimeout(dfd.callback(() => {
					assert.deepEqual(parent.state.children, [ 'widget2', 'widget3' ]);
				}), 50);
			}, 50);
		}
	},
	'Avoids updating children if there are no changes'() {
		const parent = createStatefulChildrenList({
			widgetRegistry
		});

		let setCount = 0;
		const { set: setChildren } = Object.getOwnPropertyDescriptor(createStatefulChildrenList.prototype, 'children');
		Object.defineProperty(parent, 'children', {
			set(value: any) {
				setCount++;
				setChildren.call(parent, value);
			}
		});

		parent.setState({ children: [ 'widget1' ]});
		return delay().then(() => {
			assert.equal(setCount, 1);
			parent.setState({ children: [ 'widget1' ]});
			return delay();
		}).then(() => {
			assert.equal(setCount, 1);
		});
	},
	'Avoids updating state if there are no changes'() {
		const parent = createStatefulChildrenList({
			widgetRegistry
		});

		let setCount = 0;
		const { setState } = parent;
		parent.setState = (state: any) => {
			setCount++;
			return setState.call(parent, state);
		};

		parent.emit({
			type: 'childlist',
			target: parent,
			children: List([ widget1 ])
		});

		return delay().then(() => {
			assert.equal(setCount, 1);

			parent.emit({
				type: 'childlist',
				target: parent,
				children: List([ widget1 ])
			});

			return delay();
		}).then(() => {
			assert.equal(setCount, 1);
		});
	},
	destroy() {
		const parent = createStatefulChildrenList({
			widgetRegistry
		});

		return delay().then(() => {
			assert.doesNotThrow(() => {
				parent.destroy();
			});
		});
	},
	'emits error if registry rejects get()'() {
		let rejectingRegistry = Object.create(widgetRegistry);
		const expected = new Error();
		rejectingRegistry.get = () => Promise.reject(expected);

		const dfd = this.async();

		const parent = createStatefulChildrenList({
			widgetRegistry: rejectingRegistry,
			state: {
				children: ['widget1']
			}
		});

		parent.on('error', dfd.callback((evt: any) => {
			assert.strictEqual(evt.target, parent);
			assert.strictEqual(evt.error, expected);
		}));
	},
	'latest state determines the children'() {
		const { get } = widgetRegistry;
		let registry = Object.create(widgetRegistry);

		const parent = createStatefulChildrenList({
			widgetRegistry: registry,
			state: {
				children: ['widget1']
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

			parent.setState({
				children: ['widget2']
			});

			assert.ok(resolveFirst);
		}).then(() => {
			registry.get = (id: string) => {
				return new Promise((resolve) => {
					const second = get.call(registry, id);
					resolveSecond = () => resolve(second);
				});
			};

			parent.setState({
				children: ['widget3']
			});

			assert.ok(resolveSecond);
			resolveSecond();

			return delay();
		}).then(() => {
			assert.isTrue(List([ widget3 ]).equals(parent.children));

			resolveFirst();
			return delay();
		}).then(() => {
			assert.isTrue(List([ widget3 ]).equals(parent.children));
		});
	}
});
