import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCloseableMixin from 'src/mixins/createCloseableMixin';

registerSuite({
	name: 'mixins/createCloseableMixin',
	'close()': {
		'is closable'() {
			let count = 0;
			const closeable = createCloseableMixin({
				state: {
					closeable: true
				}
			});

			closeable.own({
				destroy() {
					count++;
				}
			});

			return closeable.close().then((result) => {
				assert.isTrue(result, 'close should resolve to true');
				assert.strictEqual(count, 1, 'destroy should have been called');
			});
		},
		'is not closable'() {
			let count = 0;
			const closeable = createCloseableMixin({
				state: {
					closeable: false
				}
			});

			closeable.own({
				destroy() {
					count++;
				}
			});

			return closeable.close().then((result) => {
				assert.isFalse(result, 'close should resolve to false');
				assert.strictEqual(count, 0, 'destroy should not have been called');
			});
		}
	},
	'on("close")': {
		'event default prevented'() {
			let count = 0;
			const closeable = createCloseableMixin({
				state: {
					closeable: true
				}
			});

			closeable.own({
				destroy() {
					count++;
				}
			});

			closeable.on('close', (event) => {
				event.preventDefault();
				assert.strictEqual(event.target, closeable);
				return false;
			});

			return closeable.close().then((result) => {
				assert.isFalse(result, 'close should resolve to false');
				assert.strictEqual(count, 0, 'destroy should not have been called');
			});
		}
	}
});
