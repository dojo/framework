import 'dojo/has!host-node?../support/loadJsdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import projector, { createProjector } from 'src/projector';
import { h } from 'maquette/maquette';
import createRenderable from 'src/mixins/createRenderable';
import createDestroyable from 'dojo-compose/mixins/createDestroyable';
import { ComposeFactory } from 'dojo-compose/compose';
import { Child } from 'src/mixins/interfaces';

const createRenderableChild = createDestroyable
	.mixin(createRenderable) as ComposeFactory<Child, any>;

registerSuite({
	name: 'projector',
	setup() {
		projector.clear();
	},
	basic() {
		const dfd = this.async();
		const childNodeLength = document.body.childNodes.length;
		let nodeText = 'foo';
		const renderable = createRenderableChild({
			render() {
				return h('h2', [ nodeText ] );
			}
		});
		projector.append(renderable);
		const attachHandle = projector.attach();
		setTimeout(() => {
			assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
			assert.strictEqual((<HTMLElement> document.body.lastChild).innerHTML, nodeText);
			assert.strictEqual((<HTMLElement> document.body.lastChild).tagName.toLowerCase(), 'h2');
			nodeText = 'bar';
			projector.invalidate();
			setTimeout(() => {
				assert.strictEqual((<HTMLElement> document.body.lastChild).innerHTML, nodeText);
				renderable.destroy().then(() => {
					projector.invalidate();
					setTimeout(dfd.callback(() => {
						assert.strictEqual(document.body.childNodes.length, childNodeLength, 'child should have been removed');
						attachHandle.destroy();
					}), 100);
				});
			}, 100);
		}, 100);
	},
	'lifycycle'() {
		const dfd = this.async();
		const div = document.createElement('div');
		document.body.appendChild(div);
		const projector1 = createProjector({});
		projector1.setRoot(div);
		let nodeText = 'bar';
		const renderable = createRenderableChild({
			render() {
				return h('h1', [ nodeText ]);
			}
		});
		const addHandle = projector1.append(renderable);
		assert.strictEqual(div.childNodes.length, 0, 'there should be no children');
		projector1.attach();
		setTimeout(() => {
			assert.strictEqual(div.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> div.firstChild).tagName.toLowerCase(), 'h1');
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, nodeText);
			nodeText = 'foo';
			projector1.invalidate();
			setTimeout(() => {
				assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, nodeText);
				addHandle.destroy();
				projector1.invalidate();
				setTimeout(dfd.callback(() => {
					assert.strictEqual(div.childNodes.length, 0, 'the node should be removed');
					projector1.destroy();
				}), 100);
			}, 100);
		}, 100);
	},
	'reattach'() {
		const projector1 = createProjector({});
		const div = document.createElement('div');
		projector1.setRoot(div);
		const handle = projector1.attach();
		assert.strictEqual(handle, projector1.attach(), 'same handle should be returned');
		handle.destroy();
	},
	'setRoot throws when already attached'() {
		const projector = createProjector({});
		const div = document.createElement('div');
		projector.setRoot(div);
		const handle = projector.attach();
		assert.throws(() => {
			projector.setRoot(document.body);
		}, Error, 'already attached');
		handle.destroy();
	},
	'append()'() {
		const dfd = this.async();
		const projector = createProjector();
		const div = document.createElement('div');
		document.body.appendChild(div);
		projector.setRoot(div);
		const handle = projector.append([
			createRenderableChild({ render() { return h('foo', [ 'foo' ]); } }),
			createRenderableChild({ render() { return h('bar', [ 'bar' ]); } })
		]);
		const attachHandle = projector.attach();
		setTimeout(() => {
			assert.strictEqual(div.childNodes.length, 2);
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, 'foo');
			assert.strictEqual((<HTMLElement> div.lastChild).innerHTML, 'bar');
			handle.destroy();
			projector.invalidate();
			setTimeout(dfd.callback(() => {
				handle.destroy();
				assert.strictEqual(div.childNodes.length, 0);
				attachHandle.destroy();
			}), 100);
		}, 100);
	},
	'insert()'() {
		const dfd = this.async();
		const projector = createProjector();
		const div = document.createElement('div');
		document.body.appendChild(div);
		projector.setRoot(div);
		const handle = projector.insert(createRenderableChild({ render() { return h('foo', [ 'foo' ]); } }), 'first');
		const attachHandle = projector.attach();
		setTimeout(() => {
			assert.strictEqual(div.childNodes.length, 1);
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, 'foo');
			handle.destroy();
			projector.invalidate();
			setTimeout(dfd.callback(() => {
				handle.destroy();
				assert.strictEqual(div.childNodes.length, 0);
				attachHandle.destroy();
			}), 100);
		}, 100);
	}
});
