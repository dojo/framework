import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v } from '../../src/d';
import { WidgetProperties, HNode } from '../../src/interfaces';
import { ProjectorMixin } from '../../src/mixins/Projector';
import { WidgetBase } from '../../src/WidgetBase';
import { waitFor } from './waitFor';

class TesterWidget extends WidgetBase<WidgetProperties> {
	public lifeCycleCreated: Array<{key: string, element: Element}> = [];
	public lifeCycleUpdated: Array<{key: string, element: Element}> = [];

	protected vnode: HNode;
	public modify = false;

	protected onElementCreated(element: Element, key: string): void {
		this.lifeCycleCreated.push({
			key: key,
			element: element
		});
	}

	protected onElementUpdated(element: Element, key: string): void {
		this.lifeCycleUpdated.push({
			key: key,
			element: element
		});
	}

	public callInvalidate() {
		this.invalidate();
	}
}

/**
 * Test widget that records the calls to the lifecycle methods.
 */
class WidgetA extends TesterWidget {

	public render(): HNode {
		let vnode = this.vnode;

		if (vnode) {
			if (this.modify) {
				let child = <HNode> vnode.children[0]!;
				child = <HNode> child.children[0]!;
				child.children!.push(v('span', {key: 'addition', id: 'addition'}, [' Modified!']));
			}
		} else {
			this.vnode = vnode = v('div', {
				key: 'div1'
			}, [
				v('div', {}, [
					v('div', {
						key: 'div2'
					}, ['This is a test.'])
				])
			]);
		}
		return vnode;
	}
}

/**
 * Test widget that adds afterCreate and afterUpdate callbacks to each vnode.
 */
let afterCreateCounter = 0;
let afterUpdateCounter = 0;
function incrementCreateCounter(): void {
	afterCreateCounter++;
}

function incrementUpdateCounter(): void {
	afterUpdateCounter++;
}
class WidgetB extends TesterWidget {

	public render(): HNode {
		let vnode = this.vnode;

		if (vnode) {
			if (this.modify) {
				vnode.children.push(v('div', {
					key: 'addition',
					id: 'addition',
					afterCreate: incrementCreateCounter.bind(this),
					afterUpdate: incrementUpdateCounter.bind(this)
				}, ['Modified']));
			}
		} else {
			this.vnode = vnode = v('div', {
				key: 'div1',
				afterCreate: incrementCreateCounter.bind(this),
				afterUpdate: incrementUpdateCounter.bind(this)
			}, [
				v('div', {
					afterCreate: incrementCreateCounter.bind(this),
					afterUpdate: incrementUpdateCounter.bind(this)
				}, [
					v('div', {
						key: 'div2',
						afterCreate: incrementCreateCounter.bind(this),
						afterUpdate: incrementUpdateCounter.bind(this)
					}, ['This is a test'])
				])
			]);
		}

		return vnode;
	}
}

class WidgetC extends TesterWidget {

	public render(): HNode {
		// Always creates a new vnode.
		const vnode = v('div', {
			key: 'div1'
		}, ['Simple Widget']);

		if (this.modify) {
			vnode.children.push(v('span', {
				key: 'addition',
				id: 'addition'
			}, [' Modified.']));
		}

		return vnode;
	}
}

let root: Element | undefined;

registerSuite({
	name: 'WidgetBase Node Lifecycle',

	beforeEach() {
		afterCreateCounter = 0;
		afterUpdateCounter = 0;
		root = document.createElement('div');
		document.body.appendChild(root);
	},

	afterEach() {
		if (root && root.parentNode) {
			root.parentNode.removeChild(root);
			root = undefined;
		}
	},

	'on create'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		const handle = projector.append(root);
		assert.strictEqual(projector.lifeCycleCreated.length, 2);
		assert.strictEqual(projector.lifeCycleUpdated.length, 0);
		handle.destroy();
	},

	'on create order'() {
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		const handle = projector.append(root);
		assert.strictEqual(projector.lifeCycleCreated[0].key, 'div2');
		assert.strictEqual(projector.lifeCycleCreated[1].key, 'div1');
		handle.destroy();
	},

	'on create with afterCreate'() {
		const Projector = ProjectorMixin(WidgetB);
		const projector = new Projector();
		const handle = projector.append(root);
		assert.strictEqual(projector.lifeCycleCreated.length, 2);
		// afterCreateCounter will be 1 because the other two afterCreate callbacks will be replaced in
		// WidgetBase.
		assert.strictEqual(afterCreateCounter, 1);
		assert.strictEqual(afterUpdateCounter, 0);
		assert.strictEqual(projector.lifeCycleUpdated.length, 0);
		handle.destroy();
	},

	async 'on update'() {
		// Render WidgetA and then modify it.  Look for calls to the updated lifecycle method.
		const Projector = ProjectorMixin(WidgetA);
		const projector = new Projector();
		await projector.append(root);

		projector.lifeCycleCreated = [];

		projector.modify = true;
		projector.callInvalidate();

		await waitFor((): boolean => {
			return document.getElementById('addition') != null;
		}, 'DOM update did not occur', 10);

		assert.strictEqual(projector.lifeCycleCreated.length, 1, 'Unexpected number of created nodes.');
		assert.strictEqual(projector.lifeCycleUpdated.length, 2, 'Unexpected number of updated nodes.');
	},

	async 'on update with afterUpdate'() {
		// Render WidgetB and then modify it.
		const Projector = ProjectorMixin(WidgetB);
		const projector = new Projector();
		await projector.append(root);

		projector.lifeCycleCreated = [];
		afterCreateCounter = 0;

		projector.modify = true;
		projector.callInvalidate();

		await waitFor((): boolean => {
			return document.getElementById('addition') != null;
		}, 'DOM update did not occur', 10);

		assert.strictEqual(projector.lifeCycleCreated.length, 1, 'Unexpected number of created nodes.');
		assert.strictEqual(projector.lifeCycleUpdated.length, 2, 'Unexpected number of updated nodes.');
		assert.strictEqual(afterCreateCounter, 0);  // afterCreate callback is replaced in WidgetBase.
		assert.strictEqual(afterUpdateCounter, 1);  // afterUpdate callback is replaced in WidgetBase.
	},

	async 'basic widget that always re-renders'() {
		const Projector = ProjectorMixin(WidgetC);
		const projector = new Projector();
		await projector.append(root);

		assert.strictEqual(projector.lifeCycleCreated.length, 1, 'Unexpected number of created nodes.');
		assert.strictEqual(projector.lifeCycleUpdated.length, 0, 'Unexpected number of updated nodes.');

		projector.lifeCycleCreated = [];
		projector.modify = true;
		projector.callInvalidate();

		await waitFor((): boolean => {
			return document.getElementById('addition') != null;
		}, 'DOM update did not occur', 10);

		assert.strictEqual(projector.lifeCycleCreated.length, 1, 'Unexpected number of created nodes.');
		assert.strictEqual(projector.lifeCycleUpdated.length, 1, 'Unexpected number of updated nodes.');
	},

	'key reuse'() {
		// Test using the same key name in different child lists.
		class DuplicateKeys extends TesterWidget {
			public render(): HNode {
				return v('div', { key: 'aDiv' }, [
					v('span', { key: 'aDiv' }, ['Testing...'])
				]);
			}
		}

		const Projector = ProjectorMixin(DuplicateKeys);
		const projector = new Projector();
		const handle = projector.append(root);
		assert.strictEqual(projector.lifeCycleCreated.length, 2, 'Unexpected number of created nodes.');
		assert.strictEqual(projector.lifeCycleCreated[0].element.tagName, 'SPAN');
		assert.strictEqual(projector.lifeCycleCreated[1].element.tagName, 'DIV');
		handle.destroy();
	}
});
