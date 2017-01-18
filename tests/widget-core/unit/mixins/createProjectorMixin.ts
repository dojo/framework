import global from '@dojo/core/global';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { spy } from 'sinon';
import createProjectorMixin, { ProjectorState } from '../../../src/mixins/createProjectorMixin';
import createWidgetBase from '../../../src/createWidgetBase';
import { v } from '../../../src/d';

const createTestWidget = createWidgetBase.mixin(createProjectorMixin);

registerSuite({
	name: 'mixins/projectorMixin',

	'construct projector with css transitions'() {
		global.cssTransitions = {};
		try {
			createTestWidget({ cssTransitions: true });
		}
		catch (err) {
			assert.fail(null, null, 'Projector should be created without throwing an error');
		}

	},
	'construting projector configured for css transitions throws when css-transitions script is not loaded.'() {
		global.cssTransitions = undefined;
		try {
			createTestWidget({ cssTransitions: true });
			assert.fail();
		}
		catch (err) {
			assert.isTrue(err instanceof Error);
			assert.equal(err.message, 'Unable to create projector with css transitions enabled. Is the \'css-transition.js\' script loaded in the page?');
		}
	},
	'render throws an error for null result'() {
		const projector = createTestWidget.override({
			getNode() {
				return null;
			}
		})();

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'render throws an error for string result'() {
		const projector = createTestWidget.override({
			getNode() {
				return '';
			}
		})();

		try {
			projector.__render__();
			assert.fail();
		}
		catch (error) {
			assert.isTrue(error instanceof Error);
			assert.equal(error.message, 'Must provide a VNode at the root of a projector');
		}
	},
	'attach to projector': {
		'append'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = createTestWidget();

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.append().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, '<h2>foo</h2>');
				assert.strictEqual(child.tagName.toLowerCase(), 'div');
				assert.strictEqual(( <HTMLElement> child.firstChild).tagName.toLowerCase(), 'h2');
			});
		},
		'replace'() {
			const projector = createTestWidget({
				tagName: 'body'
			});

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.replace().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			});
		},
		'merge'() {
			const childNodeLength = document.body.childNodes.length;
			const projector = createTestWidget();

			projector.setChildren([ v('h2', [ 'foo' ] ) ]);

			return projector.merge().then((attachHandle) => {
				assert.strictEqual(document.body.childNodes.length, childNodeLength + 1, 'child should have been added');
				const child = <HTMLElement> document.body.lastChild;
				assert.strictEqual(child.innerHTML, 'foo');
				assert.strictEqual(child.tagName.toLowerCase(), 'h2');
			});
		}
	},
	'attach event'() {
		const root = document.createElement('div');
		document.body.appendChild(root);
		const projector = createTestWidget({
			root
		});

		projector.setChildren([ v('h2', [ 'foo' ] ) ]);

		assert.strictEqual(root.childNodes.length, 0, 'there should be no children');
		let eventFired = false;
		projector.on('projector:attached', () => {
			eventFired = true;
			assert.strictEqual(root.childNodes.length, 1, 'a child should be added');
			assert.strictEqual((<HTMLElement> root.firstChild).tagName.toLowerCase(), 'div');
			assert.strictEqual((<HTMLElement> root.firstChild).innerHTML, '<h2>foo</h2>');
		});
		return projector.append().then(() => {
			assert.isTrue(eventFired);
		});
	},
	'get root'() {
		const projector = createTestWidget();
		const root = document.createElement('div');
		assert.equal(projector.root, document.body);
		projector.root = root;
		assert.equal(projector.root, root);
	},
	'get projector state'() {
		const projector = createTestWidget();

		assert.equal(projector.projectorState, ProjectorState.Detached);
		return projector.append().then(() => {
			assert.equal(projector.projectorState, ProjectorState.Attached);
			projector.destroy();
			assert.equal(projector.projectorState, ProjectorState.Detached);
		});

	},
	'destroy'() {
		const projector = createTestWidget();
		const maquetteProjectorStopSpy = spy(projector.projector, 'stop');
		const maquetteProjectorDetachSpy = spy(projector.projector, 'detach');

		return projector.append().then(() => {
			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);

			projector.destroy();

			assert.isTrue(maquetteProjectorStopSpy.calledOnce);
			assert.isTrue(maquetteProjectorDetachSpy.calledOnce);
		});

	},
	'invalidate on setting children'() {
		const projector = createTestWidget();
		let called = false;

		projector.on('invalidated', () => {
			called = true;
		});

		projector.setChildren(v('div'));

		assert.isTrue(called);
	},
	'invalidate before attached'() {
		const projector = createTestWidget();
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		projector.invalidate();

		assert.isFalse(maquetteProjectorSpy.called);
		assert.isFalse(called);
	},
	'invalidate after attached'() {
		const projector = createTestWidget();
		const maquetteProjectorSpy = spy(projector.projector, 'scheduleRender');
		let called = false;

		projector.on('render:scheduled', () => {
			called = true;
		});

		return projector.append().then(() => {
			projector.invalidate();
			assert.isTrue(maquetteProjectorSpy.called);
			assert.isTrue(called);
		});
	},
	'reattach'() {
		const root = document.createElement('div');
		const projector = createTestWidget({ root });
		const promise = projector.append();
		assert.strictEqual(promise, projector.append(), 'same promise should be returned');
	},
	'setRoot throws when already attached'() {
		const projector = createTestWidget();
		const div = document.createElement('div');
		projector.root = div;
		return projector.append().then((handle) => {
			assert.throws(() => {
				projector.root = document.body;
			}, Error, 'already attached');
		});
	}
});
