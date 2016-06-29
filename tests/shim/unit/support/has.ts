import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { exists } from 'src/support/has';

registerSuite({
	name: 'support/has',

	'features defined'() {
		[
			'es6-object-assign',
			'es6-array-from',
			'es6-array-of',
			'es6-array-fill',
			'es6-array-findindex',
			'es6-array-find',
			'es6-array-copywithin',
			'es7-array-includes',
			'es6-string-raw',
			'es6-string-fromcodepoint',
			'es6-string-codepointat',
			'es6-string-normalize',
			'es6-string-repeat',
			'es6-string-startswith',
			'es6-string-endswith',
			'es6-string-includes',
			'es6-math-imul',
			'es6-promise',
			'es6-set',
			'es6-map',
			'es6-weakmap',
			'es6-symbol',
			'float32array',
			'setimmediate',
			'postmessage',
			'microtasks',
			'dom-mutationobserver'
		].forEach((feature) => assert.isTrue(exists(feature)));
	}
});
