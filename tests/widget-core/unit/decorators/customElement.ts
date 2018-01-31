const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { customElement } from '../../../src/decorators/customElement';
import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetProperties } from '../../../src/interfaces';

interface CustomElementWidgetProperties extends WidgetProperties {
	label: string;
	labelSuffix: string;
	onClick: () => void;
}

function initialization() {}

@customElement<CustomElementWidgetProperties>({
	tag: 'custom-element',
	attributes: ['label', 'labelSuffix'],
	properties: ['label'],
	events: ['onClick'],
	initialization
})
export class CustomElementWidget extends WidgetBase<CustomElementWidgetProperties> {}

describe('@customElement', () => {
	it('Should add the descriptor to the widget prototype', () => {
		assert.deepEqual((CustomElementWidget.prototype as any).__customElementDescriptor, {
			tagName: 'custom-element',
			widgetConstructor: CustomElementWidget,
			attributes: [{ attributeName: 'label' }, { attributeName: 'labelSuffix' }],
			properties: [{ propertyName: 'label' }],
			events: [{ propertyName: 'onClick', eventName: 'click' }],
			initialization
		});
	});
});
