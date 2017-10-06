import global from '@dojo/shim/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub, SinonStub } from 'sinon';
import sendEvent from '../../support/sendEvent';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Drag, { DragResults } from '../../../src/meta/Drag';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemeableMixin } from '../../../src/mixins/Themeable';

let rAF: SinonStub;

function resolveRAF() {
	for (let i = 0; i < rAF.callCount; i++) {
		rAF.getCall(i).args[0]();
	}
	rAF.reset();
}

const emptyResults: DragResults = {
	delta: { x: 0, y: 0 },
	isDragging: false
};

registerSuite({
	name: 'support/meta/Drag',

	beforeEach() {
		rAF = stub(global, 'requestAnimationFrame');
	},

	afterEach() {
		rAF.restore();
	},

	'standard rendering'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root'
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		assert.deepEqual(dragResults, [ emptyResults, emptyResults ], 'should have been called twice, both empty results');

		widget.destroy();
		document.body.removeChild(div);
	},

	'pointer dragging a node'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointerdown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 55
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointerup', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 45
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 10, y: 5 },
				isDragging: true
			}, {
				delta: { x: -5, y: -10 },
				isDragging: false
			}
		], 'the stack of should represent a drag state');

		widget.destroy();
		document.body.removeChild(div);
	},

	'delta should be culmative between renders'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointerdown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 55
			}
		});

		sendEvent(div.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 60
			}
		});

		sendEvent(div.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 115,
				pageY: 65
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointerup', {
			eventInit: {
				bubbles: true,
				pageX: 120,
				pageY: 70
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 15, y: 15 },
				isDragging: true
			}, {
				delta: { x: 5, y: 5 },
				isDragging: false
			}
		], 'the stack of should represent a drag state');

		widget.destroy();
		document.body.removeChild(div);
	},

	'movement ignored when start event missing'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					innerHTML: 'hello world',
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				});
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 115,
				pageY: 65
			}
		});

		resolveRAF();

		sendEvent(div.firstChild as Element, 'pointerup', {
			eventInit: {
				bubbles: true,
				pageX: 120,
				pageY: 70
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults
		], 'the widget does not invalidate on ignored events');

		widget.destroy();
		document.body.removeChild(div);
	},

	'dragging where descendent is target'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('root'));
				return v('div', {
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				}, [
					v('div', {
						innerHTML: 'Hello World',
						key: 'child'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointerdown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 55
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointerup', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 45
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults,
			{
				delta: { x: 0, y: 0 },
				isDragging: true
			}, {
				delta: { x: 10, y: 5 },
				isDragging: true
			}, {
				delta: { x: -5, y: -10 },
				isDragging: false
			}
		], 'dragging should be attributed to parent node');

		widget.destroy();
		document.body.removeChild(div);
	},

	'dragging untracked node should not report results'() {
		const dragResults: DragResults[] = [];

		class TestWidget extends ProjectorMixin(ThemeableMixin(WidgetBase)) {
			render() {
				dragResults.push(this.meta(Drag).get('child2'));
				return v('div', {
					key: 'root',
					styles: {
						width: '100px',
						height: '100px'
					}
				}, [
					v('div', {
						innerHTML: 'Hello World',
						key: 'child1'
					}),
					v('div', {
						innerHTML: 'Hello World',
						key: 'child2'
					})
				]);
			}
		}

		const div = document.createElement('div');

		document.body.appendChild(div);

		const widget = new TestWidget();
		widget.append(div);

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointerdown', {
			eventInit: {
				bubbles: true,
				pageX: 100,
				pageY: 50
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointermove', {
			eventInit: {
				bubbles: true,
				pageX: 110,
				pageY: 55
			}
		});

		resolveRAF();

		sendEvent(div.firstChild!.firstChild as Element, 'pointerup', {
			eventInit: {
				bubbles: true,
				pageX: 105,
				pageY: 45
			}
		});

		resolveRAF();

		assert.deepEqual(dragResults, [
			emptyResults,
			emptyResults
		], 'there should be no drag results');

		widget.destroy();
		document.body.removeChild(div);
	}
});
