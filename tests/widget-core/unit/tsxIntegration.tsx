const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../src/WidgetBase';
import { Registry } from '../../src/Registry';
import { WidgetProperties, WNode } from '../../src/interfaces';
import { tsx, fromRegistry } from './../../src/tsx';

const registry = new Registry();

registerSuite('tsx integration', {
	'can use tsx'() {
		interface FooProperties extends WidgetProperties {
			hello: string;
		}
		class Foo extends WidgetBase<FooProperties> {
			render() {
				const { hello } = this.properties;
				return (
					<header classes={[ 'background' ]} >
						<div>{ hello }</div>
					</header>
				);
			}
		}
		class Bar extends WidgetBase<any> {
			render() {
				return <Foo hello='world' />;
			}
		}

		class Qux extends WidgetBase<any> {
			render() {
				const LazyFoo = fromRegistry<FooProperties>('LazyFoo');
				return <LazyFoo hello='cool' />;
			}
		}

		const bar = new Bar();
		bar.__setCoreProperties__({ bind: bar, baseRegistry: registry });
		bar.__setProperties__({ registry });
		const barRender = bar.__render__() as WNode;
		assert.deepEqual(barRender.properties, { hello: 'world' });
		assert.strictEqual(barRender.widgetConstructor, Foo);
		assert.lengthOf(barRender.children, 0);

		const qux = new Qux();
		qux.__setCoreProperties__({ bind: qux, baseRegistry: registry });
		qux.__setProperties__({ registry });
		const firstQuxRender = qux.__render__() as WNode;
		assert.strictEqual(firstQuxRender.widgetConstructor, 'LazyFoo');
	}
});
