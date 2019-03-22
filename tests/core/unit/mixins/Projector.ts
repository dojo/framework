const { it } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');

import { WidgetBase } from '../../../../src/core/WidgetBase';
import { ProjectorMixin } from '../../../../src/core/mixins/Projector';
import { v } from '../../../../src/core/d';

class App extends WidgetBase<{ child: string }> {
	protected render() {
		if (this.children.length) {
			return v('span', this.children);
		}
		if (this.properties.child) {
			return v('span', [this.properties.child]);
		}
		return v('span', ['widget']);
	}
}

jsdomDescribe('Projector', () => {
	it('should render the widget using append', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.append(div);
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'widget');
	});

	it('should render the widget using merge', () => {
		const div = document.createElement('div');
		const span = document.createElement('span');
		div.appendChild(span);
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.merge(span);
		assert.strictEqual((span.childNodes[0] as Text).data, 'widget');
	});

	it('should set the properties for the widget', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.setProperties({ child: 'property' });
		projector.append(div);
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'property');
	});

	it('should set the children for the widget', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.setChildren(['child']);
		projector.append(div);
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'child');
	});

	it('should return html string when ', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.append(div);
		assert.strictEqual(projector.toHtml(), '<span>widget</span>');
	});

	it('should set the root node of the projector ', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.root = div;
		projector.append();
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'widget');
	});

	it('should invalidate when properties are set after mounting', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.async = false;
		projector.root = div;
		projector.append();
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'widget');
		projector.setProperties({ child: 'property' });
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'property');
	});

	it('should invalidate when children are set after mounting', () => {
		const div = document.createElement('div');
		const Projector = ProjectorMixin(App);
		const projector = new Projector();
		projector.async = false;
		projector.root = div;
		projector.append();
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'widget');
		projector.setChildren(['child']);
		assert.strictEqual((div.childNodes[0].childNodes[0] as Text).data, 'child');
	});
});
