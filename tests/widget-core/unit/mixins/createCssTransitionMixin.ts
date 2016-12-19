import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCssTransitionMixin from '../../../src/mixins/createCssTransitionMixin';

registerSuite({
	name: 'mixins/createCssTransitionMixin',
	construction() {
		const cssTranistionMixin = createCssTransitionMixin();
		assert.isDefined(cssTranistionMixin);
	},
	'getNodeAttributes()'() {
		const cssTranistionMixin = createCssTransitionMixin({});

		cssTranistionMixin.setState({
			enterAnimation: 'enter-animation-class',
			exitAnimation: 'exit-animation-class'
		});

		const nodeAttributes = cssTranistionMixin.nodeAttributes[0].call(cssTranistionMixin, {});
		assert.strictEqual(nodeAttributes.enterAnimation, 'enter-animation-class');
		assert.strictEqual(nodeAttributes.exitAnimation, 'exit-animation-class');
	}
});
