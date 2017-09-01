import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { Base as MetaBase } from '../../../src/meta/Base';
import { WidgetBase } from '../../../src/WidgetBase';
import { stub } from 'sinon';
import { ThemeableMixin } from './../../../src/mixins/Themeable';

class TestWidgetBase<P = any> extends ThemeableMixin(WidgetBase)<P> {}

let rAF: any;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'meta base',
	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame').returns(1);
	},
	afterEach() {
		rAF.restore();
	},
	'meta returns a singleton'() {
		class TestMeta extends MetaBase {
		}

		class TestWidget extends ProjectorMixin(TestWidgetBase)<any> {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta() {
				return this.meta(TestMeta);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.strictEqual(widget.getMeta(), widget.getMeta());
	},
	'meta is provided a list of nodes with keys'() {
		class TestMeta extends MetaBase {
		}

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}

			getMeta() {
				return this.meta(TestMeta);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);
		const meta = widget.getMeta();

		assert.isTrue(meta.has('root'));
	},
	'meta renders the node if it has to'() {
		class TestMeta extends MetaBase {
			get(key: string) {
				this.requireNode(key);
				return this.nodes.get(key);
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).get('greeting');
				this.meta(TestMeta).get('name');

				return v('div', {
					innerHTML: 'hello',
					key: 'greeting'
				}, [
					v('div', {
						innerHTML: 'world',
						key: 'name'
					})
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(renders, 2, 'expected two renders');
	},
	'.has does not re-render'() {
		class TestMeta extends MetaBase {
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).has('greeting');
				this.meta(TestMeta).has('name');

				return v('div', {
					innerHTML: 'hello',
					key: 'greeting'
				}, [
					v('div', {
						innerHTML: 'world',
						key: 'name'
					})
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(renders, 1, 'expected one renders');
	},
	'multi-step render'() {
		class TestMeta extends MetaBase {
			get(key: string) {
				this.requireNode(key);
				return this.nodes.get(key);
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				const test = this.meta(TestMeta);

				return v('div', {
					innerHTML: 'hello',
					key: 'greeting'
				}, [
					test.get('greeting') ? v('div', {
						innerHTML: 'world',
						key: 'name'
					}, [
						test.get('name') ? v('div', {
							innerHTML: '!',
							key: 'exclamation'
						}) : null
					]) : null
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(renders, 3, 'expected three renders');
	},
	'meta throws an error if a required node is not found'() {
		class TestMeta extends MetaBase {
			get(key: string) {
				this.requireNode(key);
				return this.nodes.get(key);
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).get('test');

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.throws(() => {
			resolveRAF();
		}, Error, 'Required node test not found');
	},
	'requireNode accepts a callback'() {
		let callbacks = 0;
		let context: any;
		let foundNode: HTMLElement;

		class TestMeta extends MetaBase {
			get(key: string) {
				this.requireNode(key, function (this: TestMeta, node) {
					callbacks++;
					context = this;
					foundNode = node;
				});
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			getMeta() {
				return this.meta(TestMeta);
			}

			render() {
				renders++;

				this.meta(TestMeta).get('root');

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(callbacks, 1, 'callback fired when node was missing');
		assert.strictEqual(context, widget.getMeta(), 'required node called in meta context');
		assert.strictEqual(foundNode! && foundNode!.tagName, 'DIV');
		assert.strictEqual(renders, 1, 'callback did not call invalidate and did not re-render');
	},
	'asynchronous invalidation with dynamic nodes does not throw an error'() {
		let callbacks = 0;

		class TestMeta extends MetaBase {
			get(key: string) {
				this.requireNode(key, (node) => {
					callbacks++;

					this.invalidate();
				});
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				if (renders === 1) {
					this.meta(TestMeta).get('world');
				}

				return v('div', {
					key: 'root',
					innerHTML: 'hello '
				}, [
					renders === 1 ? v('div', {
						key: 'world',
						innerHTML: 'world'
					}) : null
				]);
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		assert.strictEqual(callbacks, 1, 'callback fired when node was missing');
		assert.strictEqual(renders, 1, 'only one render on until asynchronous invalidation completes');

		resolveRAF();

		assert.strictEqual(callbacks, 1, 'callback did not fire on second render');
		assert.strictEqual(renders, 2, 'callback re-rendered without required node error');
	},
	'callback can invalidate'() {
		let callbacks = 0;

		class TestMeta extends MetaBase {
			get(key: string) {
				const invalidate = !this.nodes.has(key);
				this.requireNode(key, (node) => {
					callbacks++;
					invalidate && this.invalidate();
				});
			}
		}

		let renders = 0;

		class TestWidget extends ProjectorMixin(TestWidgetBase) {
			nodes: any;

			render() {
				renders++;

				this.meta(TestMeta).get('root');

				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.strictEqual(callbacks, 2, 'callback fired when node was missing and when existing');
		assert.strictEqual(renders, 2, 'callback called invalidate causing a re-render');
	}
});
