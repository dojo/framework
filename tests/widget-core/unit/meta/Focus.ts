const { assert } = intern.getPlugin('chai');
const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');
import global from '@dojo/shim/global';
import * as sinon from 'sinon';
import Focus from '../../../src/meta/Focus';
import NodeHandler from '../../../src/NodeHandler';
import WidgetBase from '../../../src/WidgetBase';

describe('meta - Focus', () => {
	const bindInstance = new WidgetBase();
	const defaultFocus = {
		active: false,
		containsFocus: false
	};
	let element: HTMLElement;
	let activeGetter: any;
	let focus: any;
	let nodeHandler: any;
	let invalidateStub: any;
	const isNode = typeof global.fakeActiveElement === 'function';

	beforeEach((test) => {
		invalidateStub = sinon.stub();
		nodeHandler = new NodeHandler();
		focus = new Focus({
			invalidate: invalidateStub,
			nodeHandler,
			bind: bindInstance
		});

		element = document.createElement('button');
		document.body.appendChild(element);

		if (isNode) {
			activeGetter = sinon.stub(global, 'fakeActiveElement').returns(element);
		}
	});

	afterEach(() => {
		focus.destroy();
		nodeHandler.destroy();
		if (document.body.contains(element)) {
			document.body.removeChild(element);
		}
		if (isNode) {
			activeGetter.restore();
		}
	});

	describe('get', () => {
		it('will return default dimensions if a node is not loaded', () => {
			assert.deepEqual(focus.get('foo'), defaultFocus);
		});
		it('will accept a number key', () => {
			assert.deepEqual(focus.get(1234), defaultFocus);
		});
		it('will return true/true for an element with focus', (test) => {
			nodeHandler.add(element, 'root');
			element.focus();

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, true);
			assert.equal(focusResults.containsFocus, true);
		});
		it('will return false/true for an element containing focus', () => {
			const containingEl = document.createElement('div');
			containingEl.appendChild(element);
			document.body.appendChild(containingEl);
			nodeHandler.add(containingEl, 'root');
			element.focus();

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, true);
			document.body.removeChild(containingEl);
		});
		it('will return false/false for an element without focus', () => {
			const rootEl = document.createElement('div');
			nodeHandler.add(rootEl, 'root');
			element.focus();

			const focusResults = focus.get('root');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, false);
		});
		it('will only query activeElement once for multiple requests', (test) => {
			if (!isNode) {
				test.skip('test requires activeElement stub');
			}
			nodeHandler.add(element, 'root');

			let focusResults = focus.get('root');
			assert.isTrue(activeGetter.calledOnce, 'activeElement called on first .get()');
			assert.equal(focusResults.active, true);

			focusResults = focus.get('root');
			assert.isTrue(activeGetter.calledOnce, 'cached value used on second .get()');
			assert.equal(focusResults.active, true);
		});
		it('will invalidate on focus events', () => {
			const focusEvent = global.document.createEvent('Event');
			focusEvent.initEvent('focusin', true, true);
			nodeHandler.add(element, 'root');

			focus.get('root');
			global.document.dispatchEvent(focusEvent);
			assert.isTrue(invalidateStub.calledOnce);
		});
		it('will invalidate on blur events', () => {
			const blurEvent = global.document.createEvent('Event');
			blurEvent.initEvent('focusout', true, true);
			nodeHandler.add(element, 'root');

			focus.get('root');
			global.document.dispatchEvent(blurEvent);
			assert.isTrue(invalidateStub.calledOnce);
		});
		it('updates the saved activeElement value on focus events', (test) => {
			if (!isNode) {
				test.skip('test requires activeElement stub');
			}
			const child = document.createElement('span');
			const focusEvent = global.document.createEvent('Event');
			focusEvent.initEvent('focusin', true, true);
			element.appendChild(child);
			nodeHandler.add(element, 'root');

			let focusResults = focus.get('root');
			assert.isTrue(activeGetter.calledOnce, 'activeElement called on first .get()');
			assert.equal(focusResults.active, true);
			assert.equal(focusResults.containsFocus, true);

			activeGetter.restore();
			activeGetter = sinon.stub(global, 'fakeActiveElement').returns(child);
			global.document.dispatchEvent(focusEvent);
			assert.isTrue(activeGetter.calledOnce, 'activeElement called after focus event');

			activeGetter.resetHistory();
			focusResults = focus.get('root');
			assert.isFalse(activeGetter.called, 'activeElement not called on second .get()');
			assert.equal(focusResults.active, false);
			assert.equal(focusResults.containsFocus, true);
		});
		it('removes the focus and blur listeners when the meta is destroyed', (test) => {
			if (!isNode) {
				test.skip('test requires activeElement stub');
			}
			const focusEvent = global.document.createEvent('Event');
			const blurEvent = global.document.createEvent('Event');
			focusEvent.initEvent('focusin', true, true);
			blurEvent.initEvent('focusout', true, true);
			nodeHandler.add(element, 'root');

			focus.get('root');
			global.document.dispatchEvent(focusEvent);
			assert.isTrue(activeGetter.called, 'focus handler calls activeElement');
			activeGetter.resetHistory();
			global.document.dispatchEvent(blurEvent);
			assert.isTrue(activeGetter.called, 'blur handler calls activeElement');

			focus.destroy();
			activeGetter.resetHistory();
			global.document.dispatchEvent(focusEvent);
			global.document.dispatchEvent(blurEvent);
			assert.isFalse(activeGetter.called, 'focus and blur handlers removed');
		});
	});

	describe('set', () => {
		it('sets focus on the node', () => {
			const setFocus = sinon.stub();
			sinon.stub(element, 'focus').callsFake(setFocus);
			nodeHandler.add(element, 'root');

			focus.set('root');
			assert.isTrue(setFocus.calledOnce);
		});
	});
});
