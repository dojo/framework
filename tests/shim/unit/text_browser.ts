import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as text from 'src/text';
import { RootRequire } from 'src/loader';

declare const require: RootRequire;

const basePath = '../../_build/tests/support/data/';

registerSuite({
		name: 'text',

		'load': {
			'should return text'() {
				text.load(basePath + 'textLoad.txt', require, this.async().callback((val: string) => {
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			}
		}
	}
);
