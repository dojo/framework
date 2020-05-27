const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { MatchDetails } from '../../../src/routing/interfaces';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { MemoryHistory as HistoryManager } from '../../../src/routing/history/MemoryHistory';
import { Route } from '../../../src/routing/Route';
import { Registry } from '../../../src/core/Registry';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';
import { w, create, getRegistry } from '../../../src/core/vdom';
import renderer, { assertion } from '../../../src/testing/renderer';

class Widget extends WidgetBase {
	render() {
		return 'widget';
	}
}

let registry: Registry;

const routeConfig = [
	{
		path: '*',
		id: 'catch-all',
		outlet: 'catch-all'
	},
	{
		path: '/foo',
		outlet: 'foo',
		id: 'foo',
		children: [
			{
				path: '/bar',
				outlet: 'bar',
				id: 'bar'
			}
		]
	},
	{
		path: 'baz/{baz}',
		id: 'baz',
		outlet: 'baz'
	}
];

const factory = create();

const mockGetRegistry = factory(() => {
	return () => {
		return registry;
	};
});

describe('Route', () => {
	beforeEach(() => {
		registry = new Registry();
	});

	it('returns null if rendered without an available router', () => {
		const r = renderer(
			() =>
				w(Route, {
					id: 'foo',
					renderer() {
						return w(Widget, {});
					},
					routerKey: 'Does not exist'
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => null));
	});

	it('Should render the result of the renderer when the Route matches', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });

		router.setPath('/foo');
		const r = renderer(
			() =>
				w(Route, {
					id: 'foo',
					renderer() {
						return w(Widget, {});
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => w(Widget, {}, [])));
	});

	it('Should set the type as index for exact matches and capture wildcard segments', () => {
		let matchType: string | undefined;
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo');
		const r = renderer(
			() =>
				w(Route, {
					id: 'foo',
					renderer(details: MatchDetails) {
						matchType = details.type;
						return null;
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => null));
		assert.strictEqual(matchType, 'index');
	});

	it('Should set the type as wildcard for wildcard matches', () => {
		let matchType: string | undefined;
		let wildcardSegments: string[] | undefined;
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/match/me/if/you/can');
		const r = renderer(
			() =>
				w(Route, {
					id: 'catch-all',
					renderer(details: MatchDetails) {
						matchType = details.type;
						wildcardSegments = details.wildcardSegments;
						return null;
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => null));
		assert.strictEqual(matchType, 'wildcard');
		assert.deepEqual(wildcardSegments, ['match', 'me', 'if', 'you', 'can']);
	});

	it('Should set the type as error for error matches', () => {
		let matchType: string | undefined;
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/foo/other');
		const r = renderer(
			() =>
				w(Route, {
					id: 'foo',
					renderer(details: MatchDetails) {
						matchType = details.type;
						return null;
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => null));
		assert.strictEqual(matchType, 'error');
	});

	it('Should render nothing when if no router is available', () => {
		const routeConfig = [
			{
				path: '/foo',
				outlet: 'foo',
				id: 'foo'
			}
		];

		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		router.setPath('/other');
		const r = renderer(
			() =>
				w(Route, {
					id: 'foo',
					renderer(details: MatchDetails) {
						if (details.type === 'index') {
							return w(Widget, {});
						}
					}
				}),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		r.expect(assertion(() => null));
	});
});
