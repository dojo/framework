const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';
import { renderer, tsx, create } from '../../../../src/core/vdom';
import dataMiddleware, { createDataMiddleware, Resource, ResourceWrapper } from '../../../../src/core/middleware/data';
import { createResolvers } from '../../support/util';

const resolvers = createResolvers();

const sb = sandbox.create();
const invalidatorStub = sb.stub();

let resourceStub = {
	getOrRead: sb.stub()
};

jsdomDescribe('data middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
		sb.resetHistory();
	});

	it('should return default API with options', () => {
		const { callback } = dataMiddleware();
		const data = callback({
			id: 'test',
			middleware: {
				invalidator: invalidatorStub
			},
			properties: () => ({
				resource: resourceStub
			}),
			children: () => []
		});

		resourceStub.getOrRead.returns('test');
		const { getOrRead, getOptions } = data();
		const result = getOrRead(getOptions());
		assert.equal(result, 'test');
	});

	it('should invalidate when new options are set', () => {
		const { callback } = dataMiddleware();
		const data = callback({
			id: 'test',
			middleware: {
				invalidator: invalidatorStub
			},
			properties: () => ({
				resource: resourceStub
			}),
			children: () => []
		});

		let { setOptions, getOptions } = data();
		setOptions({
			pageNumber: 2,
			pageSize: 15,
			query: 'test'
		});
		assert.isTrue(invalidatorStub.calledOnce);
		const options = getOptions();
		assert.equal(options.pageNumber, 2);
		assert.equal(options.pageSize, 15);
		assert.equal(options.query, 'test');
	});

	it('should use a transform function when using createDataMiddleware', () => {
		resourceStub.getOrRead.returns(['foo', 'bar']);
		const factory = create({ data: createDataMiddleware<{ value: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { getOrRead, getOptions } = data();
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={(item: any) => ({ value: item })} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ value: 'foo' }, { value: 'bar' }])}</div>`);
	});

	it('can create shared resources that share options', () => {
		resourceStub.getOrRead.returns(['foo', 'bar']);
		const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware();
			setOptions({
				pageNumber: 99,
				pageSize: 99,
				query: 'test'
			});
			return <div>{JSON.stringify(getOptions())}</div>;
		});
		const WidgetB = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions } = dataMiddleware();
			return <div>{JSON.stringify(getOptions())}</div>;
		});
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { shared } = dataMiddleware();
			const sharedResource = shared();
			return (
				<virtual>
					<WidgetA resource={sharedResource} />
					<WidgetB resource={sharedResource} />
				</virtual>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div>${JSON.stringify({
				pageNumber: 99,
				pageSize: 99,
				query: 'test'
			})}</div><div>${JSON.stringify({
				pageNumber: 99,
				pageSize: 99,
				query: 'test'
			})}</div>`
		);
	});

	it('can reset a shared resource to obtain its own options', () => {
		resourceStub.getOrRead.returns(['foo', 'bar']);
		const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware({ reset: true });
			setOptions({
				pageNumber: 99,
				pageSize: 99,
				query: 'testA'
			});
			return <div>{JSON.stringify(getOptions())}</div>;
		});
		const WidgetB = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware({ reset: true });
			setOptions({
				pageNumber: 10,
				pageSize: 10,
				query: 'testB'
			});
			return <div>{JSON.stringify(getOptions())}</div>;
		});
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { shared } = dataMiddleware();
			const sharedResource = shared();
			return (
				<virtual>
					<WidgetA resource={sharedResource} />
					<WidgetB resource={sharedResource} />
				</virtual>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div>${JSON.stringify({
				pageNumber: 99,
				pageSize: 99,
				query: 'testA'
			})}</div><div>${JSON.stringify({
				pageNumber: 10,
				pageSize: 10,
				query: 'testB'
			})}</div>`
		);
	});

	it('can have a resource passed via a different property', () => {
		const otherResource = {
			getOrRead: sb.stub(),
			registerInvalidator: sb.stub()
		};
		otherResource.getOrRead.returns(['apple', 'pear']);
		const Widget = create({ dataMiddleware }).properties<{ otherResource: Resource }>()(function Widget({
			properties,
			middleware: { dataMiddleware }
		}) {
			const { getOrRead, getOptions } = dataMiddleware({ resource: properties().otherResource });
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { resource } = dataMiddleware();

			return <Widget resource={resource} otherResource={otherResource} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify(['apple', 'pear'])}</div>`);
	});

	it('can use key property to differentiate between options on same resource', () => {
		resourceStub.getOrRead.returns(['foo', 'bar']);
		const Widget = create({ dataMiddleware }).properties<{ otherResource: Resource | ResourceWrapper }>()(
			function Widget({ properties, middleware: { dataMiddleware } }) {
				const { setOptions } = dataMiddleware();
				const { setOptions: setOptions2, getOptions: getOptions2 } = dataMiddleware({
					key: 'two',
					resource: properties().otherResource
				});
				setOptions2({
					pageSize: 2,
					pageNumber: 2,
					query: 'two-query'
				});
				setOptions({
					pageSize: 1,
					pageNumber: 1,
					query: 'one-query'
				});
				return <div>{JSON.stringify(getOptions2())}</div>;
			}
		);
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { resource } = dataMiddleware();

			return <Widget resource={resource} otherResource={resource} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div>${JSON.stringify({
				pageSize: 2,
				pageNumber: 2,
				query: 'two-query'
			})}</div>`
		);
	});
});
