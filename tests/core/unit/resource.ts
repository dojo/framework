const { describe, it, afterEach, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';
import { createResource, createMemoryTemplate, defaultFilter } from '../../../src/core/resource';

const sb = sandbox.create();

describe('resource', () => {
	const template = {
		read: sb.stub()
	};

	beforeEach(() => {});
	afterEach(() => {
		sb.resetHistory();
	});

	it('creates a resource given a template', () => {
		const resource = createResource(template);
		assert.hasAllKeys(resource, [
			'getOrRead',
			'get',
			'getTotal',
			'subscribe',
			'unsubscribe',
			'isFailed',
			'isLoading',
			'set'
		]);
	});

	it('returns resource an associated data', () => {
		const resource = createResource()([1, 2, 3]);
		assert.hasAllKeys(resource.resource, [
			'getOrRead',
			'get',
			'getTotal',
			'subscribe',
			'unsubscribe',
			'isFailed',
			'isLoading',
			'set'
		]);
		assert.deepEqual(resource.data, [1, 2, 3]);
	});

	it('provides an in-memory template by default', () => {
		const resource = createResource();
		resource.set([{ value: 1 }, { value: 2 }]);
		assert.deepEqual(resource.get({}), [{ value: 1 }, { value: 2 }]);
		assert.equal(resource.getTotal({}), 2);
	});

	it('calls the read template function with calculated offset when getOrRead is called', () => {
		template.read.returns({ data: [], total: 0 });
		const resource = createResource(template);
		const query = [{ value: 'test', keys: ['foo', 'bar'] }];
		resource.getOrRead({ pageNumber: 2, pageSize: 10, query });
		assert.isTrue(template.read.calledWith({ offset: 10, size: 10, query }));
	});

	it('provides the read function with a set callback to set data directly on the resource', () => {
		template.read.returns({ data: [], total: 0 });
		const resource = createResource(template);
		resource.getOrRead({ pageNumber: 1, pageSize: 10 });
		const set: any = template.read.args[0][1];
		const data = ['foo', 'bar'];
		set(0, data);
		assert.deepEqual(resource.get({}), data);
	});

	it('sets the date and total when the set function is used to sideload data', () => {
		const testData = [{ value: 1 }, { value: 2 }];
		template.read.returns({ data: testData, total: 2 });
		const resource = createResource(template);
		resource.set(testData);
		assert.deepEqual(resource.get({}), testData);
		assert.equal(resource.getTotal({}), 2);
	});

	it('does not call read if the data is already present', () => {
		template.read.returns({ data: [], total: 0 });
		const resource = createResource(template);
		resource.getOrRead({ pageNumber: 1, pageSize: 3 });
		const set: any = template.read.args[0][1];
		const data = ['foo', 'bar', 'baz'];
		set(0, data);

		sb.resetHistory();
		const response = resource.getOrRead({ pageNumber: 1, pageSize: 3 });
		assert.deepEqual(response, data);
		assert.isTrue(template.read.notCalled);
	});

	it('sets loading flag when read returns a promise', () => {
		template.read.returns(new Promise(() => {}));
		const invalidatorStub = sb.stub();
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.subscribe('loading', options, invalidatorStub);
		resource.getOrRead(options);
		assert.isTrue(resource.isLoading(options));
		assert.isFalse(resource.isFailed(options));
		assert.isTrue(invalidatorStub.called);
	});

	it('sets failed flag when read fails', () => {
		template.read.returns({ then: sb.stub().returns({ catch: sb.stub().callsArg(0) }) });
		const loadingInvalidator = sb.stub();
		const failedInvalidator = sb.stub();
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.subscribe('loading', options, loadingInvalidator);
		resource.subscribe('failed', options, failedInvalidator);
		resource.getOrRead(options);
		assert.isFalse(resource.isLoading(options));
		assert.isTrue(resource.isFailed(options));
		assert.isTrue(loadingInvalidator.called);
		assert.isTrue(failedInvalidator.called);
	});

	it('sets data and total when async read resolves', () => {
		let resolver: any;
		const dataInvalidator = sb.stub();
		const promise = new Promise((resolve) => {
			resolver = resolve;
		});
		template.read.returns(promise);
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.subscribe('data', options, dataInvalidator);
		resource.getOrRead(options);
		resolver({ data: ['foo', 'bar'], total: 2 });
		return promise.then(() => {
			assert.isTrue(dataInvalidator.calledOnce);
			const data = resource.getOrRead(options);
			assert.deepEqual(data, ['foo', 'bar']);
			assert.isTrue(template.read.calledOnce);
			assert.equal(resource.getTotal(options), 2);
		});
	});

	it('allows a widget to unsubscribe from invalidations', () => {
		template.read.returns(new Promise(() => {}));
		const invalidatorStub = sb.stub();
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.subscribe('loading', options, invalidatorStub);
		resource.getOrRead(options);
		assert.isTrue(invalidatorStub.called);
		resource.unsubscribe(invalidatorStub);
		invalidatorStub.resetHistory();
		resource.getOrRead(options);
		assert.isTrue(invalidatorStub.notCalled);
	});

	it('returns an empty array from get if data requested not present', () => {
		template.read.returns({ data: [], total: 0 });
		const resource = createResource(template);
		resource.getOrRead({ pageNumber: 1, pageSize: 10 });
		const set: any = template.read.args[0][1];
		const data = ['foo', 'bar'];
		set(2, data);
		const firstPageGet = resource.get({ pageNumber: 1, pageSize: 2 });
		assert.isEmpty(firstPageGet);
		const secondPageGet = resource.get({ pageNumber: 2, pageSize: 2 });
		assert.deepEqual(secondPageGet, ['foo', 'bar']);
	});

	it('returns immediately from getOrRead if requested data present', () => {
		template.read.returns({ data: [], total: 0 });
		const resource = createResource(template);
		resource.getOrRead({ pageNumber: 1, pageSize: 10 });
		const set: any = template.read.args[0][1];
		const data = ['foo', 'bar'];
		set(2, data);
		template.read.resetHistory();
		const secondPageGetOrRead = resource.getOrRead({ pageNumber: 2, pageSize: 2 });
		assert.deepEqual(secondPageGetOrRead, ['foo', 'bar']);
		assert.isTrue(template.read.notCalled);
	});

	it('Can use default filter with memory resource', () => {
		const resource = createResource(createMemoryTemplate({ filter: defaultFilter }));
		resource.set([{ value: 'one' }, { value: 'two' }]);
		assert.deepEqual(resource.get({}), [{ value: 'one' }, { value: 'two' }]);
		assert.equal(resource.getTotal({}), 2);
		let results = resource.getOrRead({ pageNumber: 1, pageSize: 10, query: [{ value: 'one', keys: ['value'] }] });
		assert.deepEqual(results, [{ value: 'one' }]);
		results = resource.getOrRead({ pageNumber: 1, pageSize: 10, query: [{ value: 'one', keys: ['other'] }] });
		assert.deepEqual(results, [{ value: 'one' }, { value: 'two' }]);
	});

	it('Can provide a custom filter with memory resource', () => {
		const resource = createResource<{ value: string }>(
			createMemoryTemplate({
				filter: (query, item) => {
					if (item.value === 'two') {
						return true;
					}
					return false;
				}
			})
		);
		resource.set([{ value: 'one' }, { value: 'two' }]);
		assert.deepEqual(resource.get({}), [{ value: 'one' }, { value: 'two' }]);
		assert.equal(resource.getTotal({}), 2);
		const results = resource.getOrRead({ pageNumber: 1, pageSize: 10, query: [{ value: 'one', keys: ['value'] }] });
		assert.deepEqual(results, [{ value: 'two' }]);
	});
});
