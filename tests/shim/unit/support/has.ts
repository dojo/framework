import { exists } from '../../../src/support/has';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('support/has', {
	'features defined'() {
		[
			'dom-mutationobserver',
			'es-observable',
			'es2017-object',
			'es2017-string',
			'es6-array',
			'es6-array-fill',
			'es6-map',
			'es6-math',
			'es6-math-imul',
			'es6-object',
			'es6-promise',
			'es6-set',
			'es6-string',
			'es6-string-raw',
			'es6-symbol',
			'es6-weakmap',
			'es7-array',
			'microtasks',
			'postmessage',
			'raf',
			'setimmediate'
		].forEach((feature) => assert.isTrue(exists(feature)));
	}
});
