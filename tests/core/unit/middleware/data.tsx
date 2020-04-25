const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';
import { renderer, tsx, create, invalidator } from '../../../../src/core/vdom';
import dataMiddleware, { createDataMiddleware, ResourceOrResourceWrapper } from '../../../../src/core/middleware/data';
import { createResolvers } from '../../support/util';
import { Resource } from '../../../../src/core/resource';

const resolvers = createResolvers();

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const destroyStub = sb.stub();
const diffPropertyStub = sb.stub();

let resourceStub: any = sb.stub();

resourceStub.getOrRead = sb.stub();
resourceStub.getTotal = sb.stub();
resourceStub.subscribe = sb.stub();
resourceStub.unsubscribe = sb.stub();
resourceStub.isLoading = sb.stub();
resourceStub.isFailed = sb.stub();
resourceStub.get = sb.stub();
resourceStub.set = sb.stub();

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
				invalidator: invalidatorStub,
				destroy: destroyStub,
				diffProperty: diffPropertyStub
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

	it('can call get with options', () => {
		const { callback } = dataMiddleware();
		const data = callback({
			id: 'test',
			middleware: {
				invalidator: invalidatorStub,
				destroy: destroyStub,
				diffProperty: diffPropertyStub
			},
			properties: () => ({
				resource: resourceStub
			}),
			children: () => []
		});

		resourceStub.get.returns('test');
		const { get, getOptions } = data();
		const result = get(getOptions());
		assert.equal(result, 'test');
	});

	it('should invalidate when new options are set', () => {
		const { callback } = dataMiddleware();
		const data = callback({
			id: 'test',
			middleware: {
				invalidator: invalidatorStub,
				destroy: destroyStub,
				diffProperty: diffPropertyStub
			},
			properties: () => ({
				resource: resourceStub
			}),
			children: () => []
		});

		let { setOptions, getOptions } = data();
		setOptions({
			pageNumber: 2,
			pageSize: 15
		});
		assert.isTrue(invalidatorStub.calledOnce);
		const options = getOptions();
		assert.equal(options.pageNumber, 2);
		assert.equal(options.pageSize, 15);
	});

	it('should transform getOrRead response when using createDataMiddleware', () => {
		resourceStub.getOrRead.returns([{ item: 'foo' }, { item: 'bar' }]);
		const factory = create({ data: createDataMiddleware<{ value: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { getOrRead, getOptions } = data();
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={{ value: ['item'] }} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ value: 'foo' }, { value: 'bar' }])}</div>`);
	});

	it('should concat multiple sources into a single response field where appropriate', () => {
		resourceStub.getOrRead.returns([{ a: 'foo', b: 'b' }, { a: 'bar', b: 'b' }]);
		const factory = create({ data: createDataMiddleware<{ value: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { getOrRead, getOptions } = data();
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={{ value: ['a', 'b'] }} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ value: 'foo b' }, { value: 'bar b' }])}</div>`);
	});

	it('should not convert single sources into strings', () => {
		resourceStub.getOrRead.returns([{ a: true, b: 2 }, { a: false, b: 3 }, { b: 4 }]);
		const factory = create({ data: createDataMiddleware<{ value: string; foo: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { getOrRead, getOptions } = data();
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={{ value: ['a'], foo: ['b'] }} />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div>${JSON.stringify([{ value: true, foo: 2 }, { value: false, foo: 3 }, { foo: 4 }])}</div>`
		);
	});

	it('should transform get response when using createDataMiddleware', () => {
		resourceStub.get.returns([{ item: 'foo' }, { item: 'bar' }]);
		const factory = create({ data: createDataMiddleware<{ value: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { get, getOptions } = data();
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={{ value: ['item'] }} />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ value: 'foo' }, { value: 'bar' }])}</div>`);
	});

	it('should transform appropriate query options when calling resource apis', () => {
		const factory = create({ data: createDataMiddleware<{ value: string }>() });
		const App = factory(function App({ middleware: { data } }) {
			const { get } = data();
			return (
				<div>
					{JSON.stringify(
						get({
							query: {
								value: 'test',
								foo: 'bar'
							}
						})
					)}
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} transform={{ value: ['item'] }} />);
		r.mount({ domNode: root });
		assert.isTrue(
			resourceStub.get.calledWith({ query: [{ keys: ['item'], value: 'test' }, { keys: ['foo'], value: 'bar' }] })
		);
	});

	it('should still convert query options to resource query format when not using a transform', () => {
		const factory = create({ data: dataMiddleware });
		const App = factory(function App({ middleware: { data } }) {
			const { get } = data();
			return (
				<div>
					{JSON.stringify(
						get({
							query: {
								value: 'test',
								foo: 'bar'
							}
						})
					)}
				</div>
			);
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		assert.isTrue(
			resourceStub.get.calledWith({
				query: [{ keys: ['value'], value: 'test' }, { keys: ['foo'], value: 'bar' }]
			})
		);
	});

	it('can create shared resources that share options', () => {
		resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
		const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware();
			setOptions({
				pageNumber: 99,
				pageSize: 99,
				query: { value: 'test' }
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
				query: { value: 'test' }
			})}</div><div>${JSON.stringify({
				pageNumber: 99,
				pageSize: 99,
				query: { value: 'test' }
			})}</div>`
		);
	});

	it('can reset a shared resource to obtain its own options', () => {
		resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
		const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware({ reset: true });
			setOptions({
				pageNumber: 99,
				pageSize: 99,
				query: { value: 'testA' }
			});
			return <div>{JSON.stringify(getOptions())}</div>;
		});
		const WidgetB = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOptions, setOptions } = dataMiddleware({ reset: true });
			setOptions({
				pageNumber: 10,
				pageSize: 10,
				query: { value: 'testB' }
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
				query: { value: 'testA' }
			})}</div><div>${JSON.stringify({
				pageNumber: 10,
				pageSize: 10,
				query: { value: 'testB' }
			})}</div>`
		);
	});

	it('can have a resource passed via a different property', () => {
		const otherResource: any = {
			getOrRead: sb.stub(),
			getTotal: sb.stub(),
			subscribe: sb.stub(),
			unsubscribe: sb.stub(),
			isLoading: sb.stub(),
			isFailed: sb.stub(),
			set: sb.stub(),
			get: sb.stub()
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
		resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
		const Widget = create({ dataMiddleware }).properties<{ otherResource: ResourceOrResourceWrapper }>()(
			function Widget({ properties, middleware: { dataMiddleware } }) {
				const { setOptions } = dataMiddleware();
				const { setOptions: setOptions2, getOptions: getOptions2 } = dataMiddleware({
					key: 'two',
					resource: properties().otherResource
				});
				setOptions2({
					pageSize: 2,
					pageNumber: 2,
					query: { value: 'two-query' }
				});
				setOptions({
					pageSize: 1,
					pageNumber: 1,
					query: { value: 'one-query' }
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
				query: { value: 'two-query' }
			})}</div>`
		);
	});

	it('subscribes to resource events when using the api', () => {
		const { callback } = dataMiddleware();
		const data = callback({
			id: 'test',
			middleware: {
				invalidator: invalidatorStub,
				destroy: destroyStub,
				diffProperty: diffPropertyStub
			},
			properties: () => ({
				resource: resourceStub
			}),
			children: () => []
		});

		const options = {
			pageNumber: 1,
			pageSize: 10
		};

		let { getTotal, isFailed, isLoading, getOrRead } = data();
		getTotal(options);
		assert.isTrue(resourceStub.subscribe.calledWith('total', options, invalidatorStub));
		sb.resetHistory();
		isFailed(options);
		assert.isTrue(resourceStub.subscribe.calledWith('failed', options, invalidatorStub));
		sb.resetHistory();
		getOrRead(options);
		assert.isTrue(resourceStub.subscribe.calledWith('data', options, invalidatorStub));
		sb.resetHistory();
		isLoading(options);
		assert.isTrue(resourceStub.subscribe.calledWith('loading', options, invalidatorStub));
	});

	it('unsubscribes from the resource when widget is removed from render', () => {
		let show = true;
		let invalidate: any;
		const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { getOrRead } = dataMiddleware();
			getOrRead({ pageNumber: 1, pageSize: 2, query: { value: 'test' } });
			return <div>testing</div>;
		});
		const App = create({ dataMiddleware, invalidator })(function App({
			middleware: { dataMiddleware, invalidator }
		}) {
			const { resource } = dataMiddleware();
			invalidate = invalidator;
			return show && <Widget resource={resource} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });
		resolvers.resolveRAF();
		show = false;
		invalidate();
		resolvers.resolveRAF();
		assert.isTrue(resourceStub.unsubscribe.called);
	});

	it('returns loading status of resource', () => {
		resourceStub.isLoading.returns(true);
		const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { isLoading, getOptions } = dataMiddleware();
			const loading = isLoading(getOptions());
			return <div>{`${loading}`}</div>;
		});
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { resource } = dataMiddleware();
			return <Widget resource={resource} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });

		assert.strictEqual(root.innerHTML, `<div>true</div>`);
	});

	it('returns failed status of resource', () => {
		resourceStub.isFailed.returns(true);
		const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
			const { isFailed, getOptions } = dataMiddleware();
			const failed = isFailed(getOptions());
			return <div>{`${failed}`}</div>;
		});
		const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
			const { resource } = dataMiddleware();
			return <Widget resource={resource} />;
		});
		const root = document.createElement('div');
		const r = renderer(() => <App resource={resourceStub} />);
		r.mount({ domNode: root });

		assert.strictEqual(root.innerHTML, `<div>true</div>`);
	});

	it('should call create resource only once when provided a factory and data', () => {
		const factory = create({ data: dataMiddleware, invalidator });
		let invalidate: any;
		const App = factory(function App({ middleware: { data, invalidator } }) {
			invalidate = invalidator;
			const { get } = data();
			return <div>{JSON.stringify(get({}))}</div>;
		});
		const root = document.createElement('div');
		const factoryStub = resourceStub;
		const r = renderer(() => (
			<App resource={{ resource: factoryStub, data: [{ value: 'foo' }, { value: 'bar' }] }} />
		));
		r.mount({ domNode: root });
		resolvers.resolveRAF();
		invalidate();
		resolvers.resolveRAF();
		assert.isTrue(factoryStub.set.calledOnce);
	});

	it('should call create resource again if the data passed has changed', () => {
		const testData = [{ value: 'foo' }, { value: 'bar' }];
		const testData2 = [{ value: 'red' }, { value: 'blue' }, { value: 'green' }];
		let invalidate: any;
		let useAltData = false;

		const Widget = create({ data: dataMiddleware, invalidator })(function Widget({
			middleware: { data, invalidator }
		}) {
			const { get } = data();
			return <div>{JSON.stringify(get({}))}</div>;
		});

		const App = create({ invalidator })(function App({ middleware: { invalidator } }) {
			invalidate = invalidator;
			const resource = useAltData
				? { resource: factoryStub, data: testData2 }
				: { resource: factoryStub, data: testData };
			return <Widget resource={resource} />;
		});

		const root = document.createElement('div');
		const factoryStub = resourceStub;
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		resolvers.resolveRAF();
		useAltData = true;

		invalidate();

		resolvers.resolveRAF();
		assert.isTrue(factoryStub.set.calledTwice);
	});

	it('should call create resource again if the data passed has changed using resource to set data', () => {
		const testData = [{ value: 'foo' }, { value: 'bar' }];
		const testData2 = [{ value: 'red' }, { value: 'blue' }, { value: 'green' }];
		let invalidate: any;
		let useAltData = false;
		const factoryStub = (data: any) => {
			return {
				resource: resourceStub,
				data
			};
		};

		const Widget = create({ data: dataMiddleware, invalidator })(function Widget({
			middleware: { data, invalidator }
		}) {
			const { get } = data();
			return <div>{JSON.stringify(get({}))}</div>;
		});

		const App = create({ invalidator })(function App({ middleware: { invalidator } }) {
			invalidate = invalidator;
			return <Widget resource={useAltData ? factoryStub(testData2) : factoryStub(testData)} />;
		});

		const root = document.createElement('div');
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		resolvers.resolveRAF();
		useAltData = true;
		invalidate();
		resolvers.resolveRAF();
		assert.isTrue(resourceStub.set.calledTwice);
	});
});
