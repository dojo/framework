const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as text from '../../../src/core/text';
import { AmdRootRequire } from '../../../src/core/interfaces';

declare const require: AmdRootRequire;

registerSuite('text - browser', {
	load: {
		'should return text'(this: any) {
			text.load(
				'../support/data/textLoad.txt',
				require,
				this.async().callback((val: string) => {
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				})
			);
		}
	}
});
