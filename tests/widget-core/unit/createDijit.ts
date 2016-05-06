import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createDijit from 'src/createDijit';
import * as Dijit from '../support/dijit/Dijit';

registerSuite({
	name: 'createDijit',
	creation: {
		'no options'() {
			const dijit = createDijit();
			assert.isUndefined(dijit.Ctor);
			assert.isUndefined(dijit.params);
		},
		'with dijit constructor'() {
			const dijit = createDijit({
				Ctor: Dijit
			});

			assert.strictEqual(dijit.Ctor, Dijit);
		},
		'with mid'() {
			const dfd = this.async();

			const dijit = createDijit({
				Ctor: 'tests/support/dijit/Dijit'
			});

			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.Ctor, Dijit);
			}), 10);
		},
		'with params'() {
			const params = { foo: 'bar' };
			const dijit = createDijit({
				params: params
			});
			assert.strictEqual(dijit.params, params);
		}
	},
	'.setState()': {
		'configure'() {
			const dfd = this.async();

			const dijit = createDijit();
			dijit.setState({
				Ctor: 'tests/support/dijit/Dijit',
				params: { foo: 'bar' }
			});

			setTimeout(dfd.callback(() => {
				assert.strictEqual(dijit.Ctor, Dijit);
				assert.deepEqual(dijit.params, { foo: 'bar' });
			}), 10);
		}
	},
	'render()': {
		'tagName'() {
			const dijit = createDijit({
				tagName: 'button'
			});
			const vnode = dijit.render();
			assert.strictEqual(vnode.vnodeSelector, 'button');
		},
		'afterCreate'() {
			const dijit = createDijit({
				Ctor: Dijit,
				params: { foo: 'bar' }
			});
			const vnode = dijit.render();
			const domNode = document.createElement(vnode.vnodeSelector);
			assert.isUndefined(dijit.dijit);
			vnode.properties.afterCreate(domNode, {}, vnode.vnodeSelector, {}, []);
			assert.strictEqual(dijit.dijit.domNode, domNode);
			assert.strictEqual(dijit.dijit.srcNodeRef, domNode);
			assert.deepEqual(dijit.dijit.params, { foo: 'bar' });
			assert.deepEqual(dijit.dijit._startupCalled, 1);
			assert.deepEqual(dijit.dijit._destroyCalled, 0);
		}
	}
});
