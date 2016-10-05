import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createContainer from '../../src/createContainer';

registerSuite({
	name: 'createContainer',
	'construction'() {
		const container = createContainer();
		assert(container);
		assert.isFunction(container.destroy);
		assert.isFunction(container.emit);
		assert.isFunction(container.getChildrenNodes);
		assert.isFunction(container.getNodeAttributes);
		assert.isFunction(container.insert);
		assert.isFunction(container.invalidate);
		assert.isFunction(container.observeState);
		assert.isFunction(container.on);
		assert.isFunction(container.own);
		assert.isFunction(container.render);
		assert.isFunction(container.setState);
		assert.isObject(container.children);
	},
	'render()'() {
		const container = createContainer();
		container.append(createContainer());
		const render = container.render();
		assert.strictEqual(render.vnodeSelector, 'dojo-container');
		assert.strictEqual(render.children!.length, 1);
		assert.isUndefined(render.text);
		assert.isNull(render.domNode);
	}
});
