import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createButton, { ButtonState } from '../../src/createButton';

registerSuite({
	name: 'createButton',
	construction() {
		const button = createButton({
			state: {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		assert.strictEqual(button.state.id, 'foo');
		assert.strictEqual(button.state.label, 'bar');
		assert.strictEqual(button.state.name, 'baz');
	},
	render() {
		const button = createButton({
			state: {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		const vnode = button.render();
		assert.strictEqual(vnode.vnodeSelector, 'button');
		assert.strictEqual(vnode.text, 'bar');
		assert.strictEqual(vnode.properties['data-widget-id'], 'foo');
		assert.strictEqual(vnode.properties.name, 'baz');
		assert.strictEqual(vnode.properties['type'], 'button');
		assert.isUndefined(vnode.children);
	},
	disable() {
		const button = createButton({
			state: <ButtonState> {
				id: 'foo',
				label: 'bar',
				name: 'baz'
			}
		});
		let vnode = button.render();
		assert.isUndefined(vnode.properties['disabled']);
		button.setState({
			disabled: true
		});
		vnode = button.render();
		assert.strictEqual(vnode.properties['disabled'], 'disabled');
	}
});
