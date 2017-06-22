import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from '../../src/WidgetBase';
import { registry } from '../../src/d';
import { WidgetProperties } from '../../src/interfaces';
import { VNode } from '@dojo/interfaces/vdom';
import { fromRegistry } from './../../src/tsx';

registerSuite({
	name: 'tsx',
	'can use tsx'() {
		interface FooProperties extends WidgetProperties {
			hello: string;
		}
		class Foo extends WidgetBase<FooProperties> {
			render() {
				const { hello } = this.properties;
				return (
					<header classes={{ background: true }} >
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
		const barRender = bar.__render__() as VNode;
		const barChild = barRender.children![0];
		assert.equal(barRender.vnodeSelector, 'header');
		assert.equal(barChild.text, 'world');

		const qux = new Qux();
		const firstQuxRender = qux.__render__();
		assert.equal(firstQuxRender, null);

		registry.define('LazyFoo', Foo);
		const secondQuxRender = qux.__render__() as VNode;
		const secondQuxChild = secondQuxRender.children![0];
		assert.equal(secondQuxRender.vnodeSelector, 'header');
		assert.equal(secondQuxChild.text, 'cool');
	}
});
