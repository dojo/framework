const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../src/widget-core/WidgetBase';
import { Registry } from '../../../src/widget-core/Registry';
import { WNode } from '../../../src/widget-core/interfaces';
import { tsx, fromRegistry } from '../../../src/widget-core/tsx';

const registry = new Registry();

registerSuite('tsx integration', {
	'can use tsx'() {
		interface FooProperties {
			hello: string;
		}
		class Foo extends WidgetBase<FooProperties> {
			render() {
				const { hello } = this.properties;
				return (
					<header classes={['background']}>
						<div>{hello}</div>
					</header>
				);
			}
		}
		class Bar extends WidgetBase<any> {
			render() {
				return <Foo hello="world" />;
			}
		}

		class Qux extends WidgetBase<any> {
			render() {
				const LazyFoo = fromRegistry<FooProperties>('LazyFoo');
				return <LazyFoo hello="cool" />;
			}
		}

		const bar = new Bar();
		bar.registry.base = registry;
		const barRender = bar.__render__() as WNode;
		assert.deepEqual(barRender.properties, { hello: 'world' } as any);
		assert.strictEqual(barRender.widgetConstructor, Foo);
		assert.lengthOf(barRender.children, 0);

		const qux = new Qux();
		qux.registry.base = registry;
		const firstQuxRender = qux.__render__() as WNode;
		assert.strictEqual(firstQuxRender.widgetConstructor, 'LazyFoo');
	}
});
