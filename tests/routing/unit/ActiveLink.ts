const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Registry } from '../../../src/widget-core/Registry';

import { Router } from '../../../src/routing/Router';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';
import { WNode } from '../../../src/widget-core/interfaces';
import Link from '../../../src/routing/Link';
import ActiveLink from '../../../src/routing/ActiveLink';

const registry = new Registry();

const router = new Router(
	[
		{
			path: 'foo',
			outlet: 'foo',
			children: [
				{
					path: 'bar',
					outlet: 'bar'
				}
			]
		},
		{
			path: 'other',
			outlet: 'other'
		}
	],
	{ HistoryManager: MemoryHistory }
);

registry.defineInjector('router', () => () => router);

describe('ActiveLink', () => {
	it('should invalidate when the outlet has been matched', () => {
		let invalidateCallCount = 0;
		class MyActiveLink extends ActiveLink {
			invalidate() {
				super.invalidate();
				invalidateCallCount++;
			}
		}
		const link = new MyActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCallCount = 0;
		router.setPath('/foo');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCallCount, 1);
		router.setPath('/baz');
		assert.strictEqual(invalidateCallCount, 2);
	});

	it('Does not add active class when outlet is not active', () => {
		router.setPath('/other');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should add the active class when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should mix the active class onto existing string class when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'], classes: 'bar' });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar', 'foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should mix the active class onto existing array of classes when the outlet is active', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo', 'qux'], classes: ['bar', 'baz'] });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar', 'baz', 'foo', 'qux']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should invalidate and re-render when link becomes active', () => {
		let invalidateCount = 0;
		router.setPath('/foo');
		class TestActiveLink extends ActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}
		const link = new TestActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		let dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCount = 0;
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 1);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'foo');
		router.setPath('/foo');
		assert.strictEqual(invalidateCount, 2);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});

	it('Should support changing the target outlet', () => {
		let invalidateCount = 0;
		router.setPath('/foo');
		class TestActiveLink extends ActiveLink {
			invalidate() {
				invalidateCount++;
				super.invalidate();
			}
		}
		const link = new TestActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'] });
		let dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'foo');
		invalidateCount = 0;
		link.__setProperties__({ to: 'other', activeClasses: ['foo'] });
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(invalidateCount, 1);
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'other');
		router.setPath('/foo/bar');
		assert.strictEqual(invalidateCount, 1);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, []);
		assert.deepEqual(dNode.properties.to, 'other');
		router.setPath('/other');
		assert.strictEqual(invalidateCount, 2);
		dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['foo']);
		assert.deepEqual(dNode.properties.to, 'other');
	});

	it('Should return link when the router injector is not available', () => {
		router.setPath('/foo');
		const link = new ActiveLink();
		link.registry.base = registry;
		link.__setProperties__({ to: 'foo', activeClasses: ['foo'], classes: 'bar', routerKey: 'other' });
		const dNode = link.__render__() as WNode<Link>;
		assert.strictEqual(dNode.widgetConstructor, Link);
		assert.deepEqual(dNode.properties.classes, ['bar']);
		assert.deepEqual(dNode.properties.to, 'foo');
	});
});
