const { beforeEach, describe, it } = intern.getInterface('bdd');

import { MemoryHistory as HistoryManager } from '../../../src/routing/history/MemoryHistory';
import { Registry } from '../../../src/core/Registry';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';
import { create, getRegistry, tsx } from '../../../src/core/vdom';
import harness from '../../../src/testing/harness';
import assertionTemplate from '../../../src/testing/assertionTemplate';
import Outlet from '../../../src/routing/Outlet';

let registry: Registry;

const routeConfig = [
	{
		path: '/',
		id: 'landing',
		outlet: 'main',
		defaultRoute: true
	},
	{
		path: 'widget/{widget}',
		id: 'widget',
		outlet: 'side-menu',
		children: [
			{
				path: 'tests',
				outlet: 'main',
				id: 'tests'
			},
			{
				path: 'overview',
				outlet: 'main',
				id: 'overview',
				children: [
					{
						path: 'type',
						outlet: 'main',
						id: 'type'
					}
				]
			},
			{
				path: 'example/{example}',
				outlet: 'main',
				id: 'example'
			}
		]
	}
];

const factory = create();

const mockGetRegistry = factory(() => {
	return () => {
		return registry;
	};
});

describe('Outlet', () => {
	beforeEach(() => {
		registry = new Registry();
	});

	it('should match all routes for an outlet by default', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => (
			<virtual>
				<div>overview</div>
				<div>type</div>
			</virtual>
		));
		router.setPath('/widget/widget/overview/type');
		const h = harness(
			() => (
				<Outlet id="main">
					{{
						overview: <div>overview</div>,
						type: <div>type</div>
					}}
				</Outlet>
			),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		h.expect(template);
	});

	it('should restrict matches using matcher property based on match details', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => (
			<virtual>
				<div>type</div>
			</virtual>
		));
		router.setPath('/widget/widget/overview/type');
		const h = harness(
			() => (
				<Outlet
					id="main"
					matcher={(defaultMatches, routeMap) => {
						defaultMatches.overview = Boolean(
							routeMap.get('overview') && routeMap.get('overview')!.isExact()
						);
						defaultMatches.type = Boolean(routeMap.get('type') && routeMap.get('type')!.isExact());
						return defaultMatches;
					}}
				>
					{{
						overview: <div>overview</div>,
						type: <div>type</div>
					}}
				</Outlet>
			),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		h.expect(template);
		router.setPath('/widget/widget/overview');
		h.expect(
			assertionTemplate(() => (
				<virtual>
					<div>overview</div>
				</virtual>
			))
		);
	});

	it('should be able to use custom keys with a matcher property', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => (
			<virtual>
				<div>custom</div>
			</virtual>
		));
		router.setPath('/widget/widget/overview/type');
		const h = harness(
			() => (
				<Outlet
					id="main"
					matcher={(defaultMatches) => {
						defaultMatches.custom = true;
						return defaultMatches;
					}}
				>
					{{
						custom: () => <div>custom</div>
					}}
				</Outlet>
			),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		h.expect(template);
	});

	it('should render function child if there is any route matches for the outlet', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => <div>function</div>);
		router.setPath('/widget/widget/overview/type');
		const h = harness(() => <Outlet id="main">{() => <div>function</div>}</Outlet>, {
			middleware: [[getRegistry, mockGetRegistry]]
		});
		h.expect(template);
	});

	it('should be able to access match details in children functions', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => (
			<virtual>
				<div>widget</div>
				<div>widget</div>
			</virtual>
		));
		router.setPath('/widget/widget/overview/type');
		const h = harness(
			() => (
				<Outlet id="main">
					{{
						overview: ({ params: { widget } }) => <div>{widget}</div>,
						type: ({ params: { widget } }) => <div>{widget}</div>
					}}
				</Outlet>
			),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		h.expect(template);
	});

	it('should return null if no router has been registered', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => null);
		router.setPath('/widget/widget/overview/type');
		const h = harness(() => (
			<Outlet id="main">
				{{
					overview: ({ params: { widget } }) => <div>{widget}</div>,
					type: ({ params: { widget } }) => <div>{widget}</div>
				}}
			</Outlet>
		));
		h.expect(template);
	});

	it('should return null if no routes match for the outlet', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });
		const template = assertionTemplate(() => null);
		router.setPath('/other/widget/overview/type');
		const h = harness(() => (
			<Outlet id="main">
				{{
					overview: ({ params: { widget } }) => <div>{widget}</div>,
					type: ({ params: { widget } }) => <div>{widget}</div>
				}}
			</Outlet>
		));
		h.expect(template);
	});

	it('should be able to use a custom router key', () => {
		const router = registerRouterInjector(routeConfig, registry, { HistoryManager });

		const properties: any = {
			id: 'main'
		};
		const template = assertionTemplate(() => (
			<virtual>
				<div>overview</div>
				<div assertion-key="type">type</div>
			</virtual>
		));
		router.setPath('/widget/widget/overview/type');
		const h = harness(
			() => (
				<Outlet {...properties}>
					{{
						overview: <div>overview</div>,
						type: <div>type</div>
					}}
				</Outlet>
			),
			{ middleware: [[getRegistry, mockGetRegistry]] }
		);
		h.expect(template);
		const customRouter = registerRouterInjector(routeConfig, registry, { HistoryManager, key: 'custom' });
		properties.routerKey = 'custom';
		customRouter.setPath('/widget/widget/overview');
		h.expect(template.remove('@type'));
		properties.routerKey = undefined;
		router.setPath('/widget/widget/overview/type');
		h.expect(template);
	});
});
