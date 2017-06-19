import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Evented } from '@dojo/core/Evented';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { WidgetRegistry } from '@dojo/widget-core/WidgetRegistry';
import { Constructor } from '@dojo/widget-core/interfaces';
import { registry } from '@dojo/widget-core/d';

import { MatchType } from './../../src/Route';
import { RouterInjector, registerRouterInjector, routerKey } from './../../src/RouterInjector';
import MemoryHistory from './../../src/history/MemoryHistory';

class TestRouterInjector extends RouterInjector {
	public invalidateCount = 0;

	public invalidate() {
		this.invalidateCount++;
		super.invalidate();
	}

	public render() {
		assertRender(this.properties);
		return this.properties.render();
	}
}

class MockRouter extends Evented {
	private _outletExists: boolean;
	private _outlet: any;

	constructor(exists: boolean, outlet?: any) {
		super({});
		this._outletExists = exists;
		this._outlet = outlet;
	}

	hasOutlet() {
		return this._outletExists;
	}

	getOutlet() {
		return this._outlet;
	}
}

class Main extends WidgetBase {
	render() {
		return 'Main';
	}
}

class Index extends WidgetBase {
	render() {
		return 'Index';
	}
}

class ErrorComponent extends WidgetBase {
	render() {
		return 'Error';
	}
}

let assertRender = (properties: any) => {};

registerSuite({
	name: 'RouterInjector',
	beforeEach() {
		assertRender = (properties: any) => {};
	},
	'returns null when no components are passed via properties'() {
		const context: any = new MockRouter(true, {
			type: MatchType.PARTIAL,
			params: {},
			location:
			'location'
		});
		const injector = new TestRouterInjector(context);
		injector.__setProperties__({
			render: () => { return null; },
			scope: {},
			properties: {},
			getProperties() {
				return {};
			},
			children: []
		});
		const result = injector.__render__();
		assert.isNull(result);
	},
	'returns null when outlet does not match'() {
		const context: any = new MockRouter(false);
		const injector = new TestRouterInjector(context);
		injector.__setProperties__({
			render: () => { return null; },
			scope: {},
			properties: {},
			getProperties() {
				return {
					mainComponent: Main
				};
			},
			children: []
		});
		const result = injector.__render__();
		assert.isNull(result);
	},
	'sets get properties to return the result of mapParams'() {
		assertRender = (properties: any) => {
			const mappedResults = properties.getProperties();
			assert.strictEqual(mappedResults, 'mapped');
		};
		const context: any = new MockRouter(true, {});
		const injector = new TestRouterInjector(context);
		injector.__setProperties__({
			render: () => { return null; },
			scope: {},
			properties: {},
			getProperties() {
				return {
					mainComponent: Main,
					mapParams() {
						return 'mapped';
					}
				};
			},
			children: []
		});
		injector.__render__();
	},
	'outlet matches': {
		'`outlet` outlet type': {
			'renders `null` when no main component configured'() {
				const context: any = new MockRouter(true, {
					type: MatchType.PARTIAL,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {};
					},
					children: []
				});
				const result = injector.__render__();
				assert.isNull(result);
			},
			'renders the main component when configured'() {
				const context: any = new MockRouter(true, {
					type: MatchType.PARTIAL,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {
							mainComponent: Main
						};
					},
					children: []
				});
				const result = injector.__render__();
				assert.strictEqual(result, 'Main');
			}
		},
		'index outlet type': {
			'renders `null` when no main or index component'() {
				const context: any = new MockRouter(true, {
					type: MatchType.INDEX,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {};
					},
					children: []
				});
				const result = injector.__render__();
				assert.isNull(result);
			},
			'renders main component when no index component provided'() {
				const context: any = new MockRouter(true, {
					type: MatchType.INDEX,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {
							mainComponent: Main
						};
					},
					children: []
				});
				const result = injector.__render__();
				assert.strictEqual(result, 'Main');
			},
			'renders index component when index component is provided'() {
				const context: any = new MockRouter(true, {
					type: MatchType.INDEX,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {
							mainComponent: Main,
							indexComponent: Index
						};
					},
					children: []
				});
				const result = injector.__render__();
				assert.strictEqual(result, 'Index');
			}
		},
		'error outlet type': {
			'renders `null` when no error component'() {
				const context: any = new MockRouter(true, {
					type: MatchType.ERROR,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {};
					},
					children: []
				});
				const result = injector.__render__();
				assert.isNull(result);
			},
			'renders error component when error component is provided'() {
				const context: any = new MockRouter(true, {
					type: MatchType.ERROR,
					params: {},
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {
							mainComponent: Main,
							errorComponent: ErrorComponent
						};
					},
					children: []
				});
				const result = injector.__render__();
				assert.strictEqual(result, 'Error');
			},
			'renders index component when index component is provided'() {
				const context: any = new MockRouter(true, {
					type: MatchType.ERROR,
					location:
					'location'
				});
				const injector = new TestRouterInjector(context);
				injector.__setProperties__({
					render: () => { return null; },
					scope: {},
					properties: {},
					getProperties() {
						return {
							mainComponent: Main,
							indexComponent: Index,
							errorComponent: ErrorComponent
						};
					},
					children: []
				});
				const result = injector.__render__();
				assert.strictEqual(result, 'Index');
			}
		}
	},
	'invalidates on nav start'() {
		const context: any = new MockRouter(true, {
			type: MatchType.ERROR,
			location:
			'location'
		});
		const injector = new TestRouterInjector(context);
		context.emit({ type: 'navstart' });

		assert.strictEqual(injector.invalidateCount, 1);
	},
	'Register router injector with default key and history'(this: any) {
		this.skip();
		const registry = new WidgetRegistry();
		const config = [
			{ path: 'path' }
		];
		const router = registerRouterInjector(config, registry);
		const Injector = <Constructor<RouterInjector>> registry.get(routerKey);
		assert.isNotNull(Injector);
		const injector = new Injector();
		assert.strictEqual(router, injector.toInject());
	},
	'Register router injector with custom key and history'() {
		const registry = new WidgetRegistry();
		const config = [
			{ path: 'path' }
		];
		const history = new MemoryHistory();
		const router = registerRouterInjector(config, registry, history, 'router-key');
		const Injector = <Constructor<RouterInjector>> registry.get('router-key');
		assert.isNotNull(Injector);
		const injector = new Injector();
		assert.strictEqual(router, injector.toInject());
	},
	'Register router injector throws an error if the router key has already been registered'() {
		const config = [
			{ path: 'path' }
		];
		try {
			registerRouterInjector(config, registry, new MemoryHistory());
			assert.fail('Should throw an error for reusing the router key');
		}
		catch (e) {
			// do nothing as expected
		}
	}
});
