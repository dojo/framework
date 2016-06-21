import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import {
	hasClass
} from 'src/support/decorators';
import { add } from 'src/support/has';

registerSuite({
	name: 'decorators',
	'hasClass()': {
		'feature = true'() {
			class Fill {
				type = 'fill';
			}

			class Real {
				type = 'real';
			}

			add('test-decorator-hasclass', true, true);

			@hasClass('test-decorator-hasclass', Real, Fill)
			class Target {
				type = 'target';
			}

			assert.strictEqual(Target, Real, 'the target should be the "real" class');
		},
		'feature = false'() {
			class Fill {
				type = 'fill';
			}

			class Real {
				type = 'real';
			}

			add('test-decorator-hasclass', false, true);

			@hasClass('test-decorator-hasclass', Real, Fill)
			class Target {
				type = 'target';
			}

			assert.strictEqual(Target, Fill, 'the target should be the "fill" class');
		},
		'feature not defined'() {
			class Fill {
				type = 'fill';
			}

			class Real {
				type = 'real';
			}

			assert.throws(() => {
				@hasClass('test-decorator-noclass', Real, Fill)
				class Target {
					type = 'target';
				}
			}, TypeError, 'Attempt to detect unregistered has feature');
		}
	}
});
