const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import WidgetBase from '../../../../src/core/WidgetBase';
import { watch } from '../../../../src/core/decorators/watch';

describe('Watch', () => {
	it('should invalidate on set', () => {
		let invalidateCount = 0;
		class A extends WidgetBase {
			@watch() private _a!: string;

			invalidate() {
				invalidateCount++;
			}

			render() {
				this._a = 'other';
				return this._a;
			}
		}

		const widget = new A();
		const result = widget.__render__();
		assert.strictEqual(result, 'other');
		assert.strictEqual(invalidateCount, 1);
	});
});
