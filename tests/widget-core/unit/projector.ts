import 'dojo/has!host-node?../support/loadJsdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import projector, { createProjector, arrayEquals } from '../../src/projector';
import { h } from 'maquette';
import createWidgetBase from '../../src/bases/createWidgetBase';
import global from 'dojo-core/global';

registerSuite({
	name: 'projector',
	setup() {
		projector.clear();
	},
	creation() {
		const parent = createProjector();
		assert.isFunction(parent.append);
		assert.isFunction(parent.insert);
		assert.isArray(parent.children);
	},
	basic(this: any) {
		const dfd = this.async();
		const childNodeLength = document.body.childNodes.length;
		let nodeText = 'foo';
		const renderable = createWidgetBase.override({
			render() {
				return h('h2', [ nodeText ] );
			}
		})();
		projector.append(renderable);
		projector.attach().then((attachHandle) => {
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
					}), 300);
				});
			}, 300);
		}).catch(dfd.reject);
	},
	'lifecycle'(this: any) {
		const dfd = this.async();
		const div = document.createElement('div');
		document.body.appendChild(div);
		const projector1 = createProjector({});
		projector1.setRoot(div);
		let nodeText = 'bar';
		const renderable = createWidgetBase.override({
			render() {
				return h('h1', [ nodeText ]);
			}
		})();
		const addHandle = projector1.append(renderable);
		assert.strictEqual(div.childNodes.length, 0, 'there should be no children');
		projector1.attach().then(() => {
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
				}), 300);
			}, 300);
		}).catch(dfd.reject);
	},
	'construct projector with css transitions'() {
		global.cssTransitions = {};
		try {
			createProjector({ cssTransitions: true });
		}
		catch (err) {
			assert.fail(null, null, 'Projector should be created without throwing an error');
		}

	},
	'construting projector configured for css transitions throws when css-transitions script is not loaded.'() {
		global.cssTransitions = undefined;
		try {
			createProjector({ cssTransitions: true });
		}
		catch (err) {
			assert.isTrue(err instanceof Error);
			assert.equal(err.message, 'Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
		}
	},
	'\'attach\' event'() {
		const div = document.createElement('div');
		document.body.appendChild(div);
		const projector1 = createProjector({});
		projector1.setRoot(div);
		let nodeText = 'bar';
		const renderable = createWidgetBase.override({
			render() {
				return h('h1', [ nodeText ]);
			}
		})();
		projector1.append(renderable);
		assert.strictEqual(div.childNodes.length, 0, 'there should be no children');
		let eventFired = false;
		projector1.on('attach', () => {
			eventFired = true;
			assert.strictEqual(div.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> div.firstChild).tagName.toLowerCase(), 'h1');
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, nodeText);
		});
		return projector1.attach().then(() => {
			assert.isTrue(eventFired);
			projector1.destroy();
		});
	},
	'reattach'() {
		const projector1 = createProjector({});
		const div = document.createElement('div');
		projector1.setRoot(div);
		const promise = projector1.attach();
		assert.strictEqual(promise, projector1.attach(), 'same promise should be returned');
		return promise.then((handle) => { handle.destroy(); });
	},
	'setRoot throws when already attached'() {
		const projector = createProjector({});
		const div = document.createElement('div');
		projector.setRoot(div);
		return projector.attach().then((handle) => {
			assert.throws(() => {
				projector.setRoot(document.body);
			}, Error, 'already attached');
			handle.destroy();
		});
	},
	'append()'(this: any) {
		const dfd = this.async();
		const projector = createProjector();
		const div = document.createElement('div');
		document.body.appendChild(div);
		projector.setRoot(div);
		const handle = projector.append([
			createWidgetBase.override({ render() { return h('foo', [ 'foo' ]); } })(),
			createWidgetBase.override({ render() { return h('bar', [ 'bar' ]); } })()
		]);
		projector.attach().then((attachHandle) => {
			assert.strictEqual(div.childNodes.length, 2);
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, 'foo');
			assert.strictEqual((<HTMLElement> div.lastChild).innerHTML, 'bar');
			handle.destroy();
			projector.invalidate();
			setTimeout(dfd.callback(() => {
				handle.destroy();
				assert.strictEqual(div.childNodes.length, 0);
				attachHandle.destroy();
			}), 300);
		}).catch(dfd.reject);
	},
	'insert()'(this: any) {
		const dfd = this.async();
		const projector = createProjector();
		const div = document.createElement('div');
		document.body.appendChild(div);
		projector.setRoot(div);
		const handle = projector.insert(createWidgetBase.override({ render(): any { return h('foo', [ 'foo' ]); } })(), 'first');
		projector.attach().then((attachHandle) => {
			assert.strictEqual(div.childNodes.length, 1);
			assert.strictEqual((<HTMLElement> div.firstChild).innerHTML, 'foo');
			handle.destroy();
			projector.invalidate();
			setTimeout(dfd.callback(() => {
				handle.destroy();
				assert.strictEqual(div.childNodes.length, 0);
				attachHandle.destroy();
			}), 300);
		}).catch(dfd.reject);
	},
	'on("childlist")': {
		'append()'(this: any) {
			const dfd = this.async();
			const parent = createProjector();
			const child = createWidgetBase();
			parent.on('childlist', dfd.callback((event: any) => {
				assert.strictEqual(event.type, 'childlist');
				assert.strictEqual(event.target, parent);
				assert.strictEqual(event.children, parent.children);
				assert.isTrue(arrayEquals(event.children, [ child ]));
			}));

			parent.append(child);
		}
	}
});
