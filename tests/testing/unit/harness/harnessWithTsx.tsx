const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { harness } from '../../../../src/testing/harness/harness';
import { WidgetBase } from '../../../../src/core/WidgetBase';
import { tsx, fromRegistry } from '../../../../src/core/vdom';

class ChildWidget extends WidgetBase<any> {}
const RegistryWidget = fromRegistry<any>('registry-item');
const noop = () => {};

class MyWidget extends WidgetBase {
	_count = 0;
	_onclick() {
		this._count++;
		this.invalidate();
	}

	_otherOnClick(count: any = 50) {
		this._count = count;
		this.invalidate();
	}

	render() {
		return (
			<div classes={['root', 'other']} onclick={this._otherOnClick}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={this._onclick}>
					{`hello ${this._count}`}
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		);
	}
}

describe('harness with tsx', () => {
	it('expect', () => {
		const h = harness(() => <MyWidget />);

		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('expect partial for VNode', () => {
		const h = harness(() => <MyWidget />);
		h.expectPartial('@span', () => (
			<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
				hello 0
			</span>
		));
	});

	it('expect partial for WNode constructor', () => {
		const h = harness(() => <MyWidget />);
		h.expectPartial('@widget', () => <ChildWidget key="widget" id="random-id" />);
	});

	it('expect partial for WNode registry item', () => {
		const h = harness(() => <MyWidget />);
		h.expectPartial('@registry', () => <RegistryWidget key="registry" id="random-id" />);
	});

	it('trigger by tag', () => {
		const h = harness(() => <MyWidget />);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
		h.trigger('div', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 50
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
		h.trigger('div', 'onclick', 100);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 100
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger by class', () => {
		const h = harness(() => <MyWidget />);
		h.trigger('.span', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 1
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger by class from classes array', () => {
		const h = harness(() => <MyWidget />);
		h.trigger('.root', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 50
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger by nested selector', () => {
		const h = harness(() => <MyWidget />);
		h.trigger('.root span', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 1
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger without expect', () => {
		const h = harness(() => <MyWidget />);
		h.trigger('*[key="span"]', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 1
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger by key selector', () => {
		const h = harness(() => <MyWidget />);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
		h.trigger('@span', 'onclick');
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 1
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('trigger with non matching selector', () => {
		const h = harness(() => <MyWidget />);

		assert.throws(() => h.trigger('*[key="other"]', 'onclick'));
	});

	it('custom compare for VNode', () => {
		const h = harness(() => <MyWidget />, [
			{ selector: '*[key="span"]', property: 'id', comparator: (property: any) => typeof property === 'string' }
		]);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('custom compare for constructor WNode', () => {
		const h = harness(() => <MyWidget />, [
			{ selector: '*[key="widget"]', property: 'id', comparator: (property: any) => typeof property === 'string' }
		]);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="" />
				<RegistryWidget key="registry" id="random-id" />
			</div>
		));
	});

	it('custom compare for registry item WNode', () => {
		const h = harness(() => <MyWidget />, [
			{
				selector: '*[key="registry"]',
				property: 'id',
				comparator: (property: any) => typeof property === 'string'
			}
		]);
		h.expect(() => (
			<div classes={['root', 'other']} onclick={noop}>
				<span key="span" classes="span" style="widget: 100px" id="random-id" onclick={noop}>
					hello 0
				</span>
				<ChildWidget key="widget" id="random-id" />
				<RegistryWidget key="registry" id="" />
			</div>
		));
	});
});
