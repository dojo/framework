const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { customElement } from '../../../../src/widget-core/decorators/customElement';
import { WidgetBase } from '../../../../src/widget-core/WidgetBase';
import { CustomElementChildType } from '../../../../src/widget-core/registerCustomElement';

export interface CustomElementWidgetProperties {
	label: string;
	labelSuffix: string;
	onClick: () => void;
}

function registryFactory() {
	return {} as any;
}

@customElement<CustomElementWidgetProperties>({
	tag: 'custom-element',
	attributes: ['key', 'label', 'labelSuffix'],
	properties: ['label'],
	events: ['onClick'],
	registryFactory
})
export class CustomElementWidget extends WidgetBase<CustomElementWidgetProperties> {}

describe('@customElement', () => {
	it('Should add the descriptor to the widget prototype', () => {
		assert.deepEqual((CustomElementWidget.prototype as any).__customElementDescriptor, {
			tagName: 'custom-element',
			attributes: ['key', 'label', 'labelSuffix'],
			properties: ['label'],
			events: ['onClick'],
			childType: CustomElementChildType.DOJO,
			registryFactory
		});
	});
});
