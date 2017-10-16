import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';

import global from '@dojo/shim/global';
import sendEvent from '../../support/sendEvent';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemeableMixin } from '../../../src/mixins/Themeable';

import Matches from '../../../src/meta/Matches';

let rAF: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

registerSuite({
	name: 'support/meta/Matches',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'node matches'() {
		const results: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			private _onclick(evt: MouseEvent) {
				results.push(this.meta(Matches).get('root', evt));
			}

			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					onclick: this._onclick
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'click');

		assert.deepEqual(results, [ true ], 'should have been called and the target matched');

		widget.destroy();
		document.body.removeChild(div);
	},

	'node matches with number key'() {
		const results: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			private _onclick(evt: MouseEvent) {
				results.push(this.meta(Matches).get(1234, evt));
			}

			render() {
				return v('div', {
					innerHTML: 'hello world',
					key: 1234,
					onclick: this._onclick
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'click');

		assert.deepEqual(results, [ true ], 'should have been called and the target matched');

		widget.destroy();
		document.body.removeChild(div);
	},

	'node does not match'() {
		const results: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			private _onclick(evt: MouseEvent) {
				results.push(this.meta(Matches).get('root', evt));
			}

			render() {
				return v('div', {
					key: 'root',
					onclick: this._onclick
				}, [
					v('div', {
						innerHTML: 'Hello World',
						root: 'child'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'click', {
			eventInit: {
				bubbles: true
			}
		});

		assert.deepEqual(results, [ false ], 'should have been called and the target not matching');

		widget.destroy();
		document.body.removeChild(div);
	},

	'node only exists on some renders'() {
		const results: boolean[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			private _renderSecond = false;
			private _onclick(evt: MouseEvent) {
				results.push(this.meta(Matches).get('child1', evt));
				results.push(this.meta(Matches).get('child2', evt));
				this._renderSecond = true;
				this.invalidate();
			}

			render() {
				return v('div', {
					key: 'root',
					onclick: this._onclick
				}, [
					v('div', {
						innerHTML: this._renderSecond ? 'child2' : 'child1',
						key: this._renderSecond ? 'child2' : 'child1'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'click', {
			eventInit: {
				bubbles: true
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'click', {
			eventInit: {
				bubbles: true
			}
		});

		assert.deepEqual(results, [ true, false, false, true ], 'should have been called twice and keys changed');

		widget.destroy();
		document.body.removeChild(div);
	}
});
