import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStatefulChildrenMixin, { CreateChildrenResults } from '../../../src/mixins/createStatefulChildrenMixin';
import createRenderMixin, { RenderMixin, RenderMixinOptions, RenderMixinState } from '../../../src/mixins/createRenderMixin';
import Promise from 'dojo-shim/Promise';
import { List, Map } from 'immutable';
import { Child, RegistryProvider } from '../../../src/mixins/interfaces';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/mixins/createDestroyable';
import { h } from 'maquette';

const widget1 = createRenderMixin();
const widget2 = createRenderMixin();
const widget3 = createRenderMixin();
const widget4 = createRenderMixin();

const widgetMap: { [id: string]: Child } = {
	widget1,
	widget2,
	widget3,
	widget4
};

let widgetUID = 5;

const widgetRegistry = {
	stack: <(string | symbol)[]> [],
	get(id: string | symbol): Promise<RenderMixin<RenderMixinState>> {
		widgetRegistry.stack.push(id);
		return Promise.resolve(widgetMap[id]);
	},
	identify(value: RenderMixin<RenderMixinState>): string | symbol {
		return value === widget1
			? 'widget1' : value === widget2
			? 'widget2' : value === widget3
			? 'widget3' : value === widget4
			? 'widget4' : undefined;
	},
	create<C extends RenderMixin<RenderMixinState>>(factory: ComposeFactory<C, any>, options?: any): Promise<[string | symbol, C]> {;
		return Promise.resolve<[ string, C ]>([options && options.id || `widget${widgetUID++}`, factory(options)]);
	}
};

const registryProvider: RegistryProvider<Child> = {
	get(type: string) {
		return type === 'widgets' ? widgetRegistry : null;
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
		creation(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.isTrue(List<Child>([ widget1 ]).equals(parent.children));
			}), 50);
		},
		setState(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
				assert.isTrue(List<Child>([ widget2 ]).equals(parent.children));
			}), 50);
		},
		'caching widgets'(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.isTrue(List<Child>([ widget1, widget2 ]).equals(parent.children));

					parent.setState({ children: [ 'widget2', 'widget1' ] });
					assert.isTrue(List<Child>([ widget2, widget1 ]).equals(parent.children), 'should synchronously update children when cached');
				}), 100);
			}, 100);
		},
		'childList'(this: any) {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				registryProvider
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
		creation(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.isTrue(Map<string, Child>({ widget1 }).equals(parent.children));
			}), 50);
		},
		setState(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
				assert.isTrue(Map<Child>({ widget2 }).equals(parent.children));
			}), 50);
		},
		'caching widgets'(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.isTrue(Map<Child>({ widget1, widget2 }).equals(parent.children));

					parent.setState({ children: [ 'widget2', 'widget1' ] });
					assert.isTrue(Map<Child>({ widget2, widget1 }).equals(parent.children), 'should synchronously update children when cached');
				}), 100);
			}, 100);
		},
		'childList'(this: any) {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				registryProvider
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
			registryProvider
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
			registryProvider
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
			registryProvider
		});

		return delay().then(() => {
			assert.doesNotThrow(() => {
				parent.destroy();
			});
		});
	},

	'emits error if registry rejects get()'(this: any) {
		let rejectingRegistry = Object.create(widgetRegistry);
		const expected = new Error();
		rejectingRegistry.get = () => Promise.reject(expected);

		const dfd = this.async(250);

		const parent = createStatefulChildrenList({
			registryProvider: {
				get(type: string) {
					return type === 'widgets' ? rejectingRegistry : null;
				}
			},
			state: {
				children: [ 'widget1' ]
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
			registryProvider: {
				get(type: string) {
					return type === 'widgets' ? registry : null;
				}
			},
			state: {
				children: [ 'widget1' ]
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
				children: [ 'widget2' ]
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
				children: [ 'widget3' ]
			});

			assert.ok(resolveSecond);
			resolveSecond();

			return delay();
		}).then(() => {
			assert.isTrue(List<Child>([ widget3 ]).equals(parent.children));

			resolveFirst();
			return delay();
		}).then(() => {
			assert.isTrue(List<Child>([ widget3 ]).equals(parent.children));
		});
	},

	'#createChild()': {
		'creation during mixin'() {
			let p: Promise<[string, RenderMixin<RenderMixinState>]>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChild(createRenderMixin, <RenderMixinOptions<RenderMixinState>> {
							render() {
								return h('div');
							}
						});
					}
				});

			const foo = createFoo({
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				},
				id: 'parent'
			});

			return p.then((result) => {
				const [ id ] = result;
				assert.include(id, 'parent-child');
				assert.deepEqual(foo.state.children, [ id ]);
			});
		},

		'append children'() {
			let p: Promise<[string, RenderMixin<RenderMixinState>]>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						instance.setState({ children: [ 'foo' ] });
						p = instance.createChild(createRenderMixin, <RenderMixinOptions<RenderMixinState>> {
							render() {
								return h('div');
							}
						});
					}
				});

			const foo = createFoo({
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				},
				id: 'parent'
			});

			return p.then((result) => {
				const [ id ] = result;
				assert.include(id, 'parent-child');
				assert.deepEqual(foo.state.children, [ 'foo', id ]);
			});
		},

		'creation during mixin - with setting ID'() {
			let p: Promise<[string, RenderMixin<RenderMixinState>]>;
			const registry = Object.create(widgetRegistry);

			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChild(createRenderMixin, <RenderMixinOptions<RenderMixinState>> {
							render() {
								return h('div');
							},
							id: 'foo'
						});
					}
				});

			createFoo({
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				},
				id: 'parent'
			});

			return p.then((result) => {
				const [ id ] = result;
				assert.strictEqual(id, 'foo');
			});
		},

		'non-registry rejects'(this: any) {
			const dfd = this.async();
			const stateful = createStatefulChildrenMixin();
			stateful.createChild(createRenderMixin)
				.then(() => {
					throw new Error('Should not have called');
				}, dfd.callback((err: Error) => {
					assert.instanceOf(err, Error);
					assert.strictEqual(err.message, 'Unable to resolve registry');
				}));
		}
	},

	'#createChildren()': {
		'with map'() {
			let p: Promise<CreateChildrenResults<Child>>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren({
							foo: { factory: createRenderMixin },
							bar: { factory: createRenderMixin }
						});
					}
				});

			const widget = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(({ foo, bar }) => {
				assert(foo);
				assert(bar);
				assert.include(foo.id, 'foo-child');
				assert.include(bar.id, 'foo-child');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ foo.id, bar.id ]);
			});
		},

		'with map append children'() {
			let p: Promise<CreateChildrenResults<Child>>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						instance.setState({ children: [ 'foo' ]});
						p = instance.createChildren({
							foo: { factory: createRenderMixin },
							bar: { factory: createRenderMixin }
						});
					}
				});

			const widget = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(({ foo, bar }) => {
				assert(foo);
				assert(bar);
				assert.include(foo.id, 'foo-child');
				assert.include(bar.id, 'foo-child');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ 'foo', foo.id, bar.id ]);
			});
		},

		'with map and options.id'() {
			let p: Promise<CreateChildrenResults<Child>>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren({
							foo: { factory: createRenderMixin, options: { id: 'foo' } },
							bar: { factory: createRenderMixin, options: { id: 'bar' } }
						});
					}
				});

			createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(({ foo, bar }) => {
				assert(foo);
				assert(bar);
				assert.strictEqual(foo.id, 'foo');
				assert.strictEqual(bar.id, 'bar');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
			});
		},

		'destroy with map destroys children'() {
			let p: Promise<CreateChildrenResults<Child>>;
			const registry = Object.create(widgetRegistry);
			let destroyCount = 0;
			const createDestroyRenderable = createRenderMixin
				.mixin({
					mixin: createDestroyable,
					initialize(instance) {
						instance.own({
							destroy() {
								destroyCount++;
							}
						});
					}
				});

			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren({
							foo: { factory: createDestroyRenderable, options: { id: 'foo' } },
							bar: { factory: createDestroyRenderable, options: { id: 'bar' } }
						});
					}
				});

			const foo = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(() => {
				assert.strictEqual(destroyCount, 0);
				return foo.destroy();
			})
			.then(() => {
				assert.strictEqual(destroyCount, 2);
			});
		},

		'with array'() {
			let p: Promise<[string, Child][]>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren([ [ createRenderMixin, {} ], [ createRenderMixin, {} ] ]);
					}
				});

			const widget = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(([ a, b ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.include(aID, 'foo-child');
				assert.include(bID, 'foo-child');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ aID, bID ]);
			});
		},

		'with array append children'() {
			let p: Promise<[string, Child][]>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						instance.setState({ children: [ 'foo' ]});
						p = instance.createChildren([ [ createRenderMixin, {} ], [ createRenderMixin, {} ] ]);
					}
				});

			const widget = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(([ a, b ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.include(aID, 'foo-child');
				assert.include(bID, 'foo-child');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ 'foo', aID, bID ]);
			});
		},

		'with array and options.id'() {
			let p: Promise<[string, Child][]>;
			const registry = Object.create(widgetRegistry);
			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren([ [ createRenderMixin, { id: 'foo' } ], [ createRenderMixin, { id: 'bar' } ] ]);
					}
				});

			const widget = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(([ a, b ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.strictEqual(aID, 'foo');
				assert.strictEqual(bID, 'bar');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ aID, bID ]);
			});
		},

		'destroy with array destroys children'() {
			let p: Promise<[string, Child][]>;
			const registry = Object.create(widgetRegistry);
			let destroyCount = 0;
			const createDestroyRenderable = createRenderMixin
				.mixin({
					mixin: createDestroyable,
					initialize(instance) {
						instance.own({
							destroy() {
								destroyCount++;
							}
						});
					}
				});

			const createFoo = compose({})
				.mixin({
					mixin: createStatefulChildrenMixin,
					initialize(instance) {
						p = instance.createChildren([
							[ createDestroyRenderable, { id: 'foo' } ],
							[ createDestroyRenderable, { id: 'bar' } ]
						]);
					}
				});

			const foo = createFoo({
				id: 'foo',
				registryProvider: {
					get(type: string) {
						return type === 'widgets' ? registry : null;
					}
				}
			});

			return p.then(() => {
				assert.strictEqual(destroyCount, 0);
				return foo.destroy();
			})
			.then(() => {
				assert.strictEqual(destroyCount, 2);
			});
		},

		'non-registry rejects'(this: any) {
			const dfd = this.async();
			const stateful = createStatefulChildrenMixin();
			stateful.createChildren({})
				.then(() => {
					throw new Error('Should not have been called');
				}, dfd.callback((err: Error) => {
					assert.instanceOf(err, Error);
					assert.strictEqual(err.message, 'Unable to resolve registry');
				}));
		}
	}
});
