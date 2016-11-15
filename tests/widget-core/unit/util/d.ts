import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import d from '../../../src/util/d';

registerSuite({
	name: 'util/d',
	'create DNode wrapper'() {
		const options: WidgetOptions<WidgetState> = { tagName: 'header', state: { hello: 'world' } };
		const dNode = d(createWidgetBase, options);
		assert.deepEqual(dNode.factory, createWidgetBase);
		assert.deepEqual(dNode.options, options);
	},
	'create HNode wrapper'() {
		const hNode = d('div');
		assert.isFunction(hNode.render);
		assert.lengthOf(hNode.children, 0);
	},
	'create HNode wrapper with options'() {
		const hNode = d('div', { innerHTML: 'Hello World' });
		assert.isFunction(hNode.render);
		assert.lengthOf(hNode.children, 0);
		const render = hNode.render();
		assert.equal(render.vnodeSelector, 'div');
		assert.equal(render.properties && render.properties.innerHTML, 'Hello World');
	},
	'create HNode wrapper with children'() {
		const hNode = d('div', {}, [ d('div'), d('div') ]);
		assert.isFunction(hNode.render);
		assert.lengthOf(hNode.children, 2);
	},
	'throws an error if tagName/Factory is not a string or a Function'() {
		assert.throws(() => { d(<any> 1); }, Error);
	}
});
