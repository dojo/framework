const { describe, it, afterEach, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';
import { createResource } from '../../../src/core/resource';

const sb = sandbox.create();

describe('resource', () => {
	const template = {
		read: sb.stub()
	};

	beforeEach(() => {});
	afterEach(() => {
		sb.resetHistory();
	});

	it('creates a resouce given a template', () => {
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

	it('sets status flags correctly if read returns a promise', () => {
		let resolver: any;
		const promise = new Promise((resolve) => {
			resolver = resolve;
		});
		template.read.returns(promise);
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.getOrRead(options);
		assert.isTrue(resource.isLoading(options), 'a');
		assert.isFalse(resource.isFailed(options), 'b');
		resolver({ data: ['foo', 'bar'], total: 2 });
		assert.isFalse(resource.isLoading(options), 'c');
		assert.isFalse(resource.isFailed(options), 'd');
	});

	it('sets status flags correctly when read rejects a promise', () => {
		let rejecter: any;
		const promise = new Promise((resolve, reject) => {
			rejecter = reject;
		});
		template.read.returns(promise);
		const resource = createResource(template);
		const options = { pageNumber: 1, pageSize: 2, query: [{ value: 'test', keys: ['foo', 'bar'] }] };
		resource.getOrRead(options);
		assert.isTrue(resource.isLoading(options));
		assert.isFalse(resource.isFailed(options));
		rejecter();
		assert.isFalse(resource.isLoading(options));
		assert.isTrue(resource.isFailed(options));
	});
});
