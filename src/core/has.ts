import global from '@dojo/shim/global';
import has, { add } from '@dojo/shim/support/has';

export * from '@dojo/shim/support/has';
export default has;

add('object-assign', typeof global.Object.assign === 'function', true);

add('arraybuffer', typeof global.ArrayBuffer !== 'undefined', true);
add('formdata', typeof global.FormData !== 'undefined', true);
add('filereader', typeof global.FileReader !== 'undefined', true);
add('xhr', typeof global.XMLHttpRequest !== 'undefined', true);
add('xhr2', has('xhr') && 'responseType' in global.XMLHttpRequest.prototype, true);
add('blob', function () {
	if (!has('xhr2')) {
		return false;
	}

	const request = new global.XMLHttpRequest();
	request.open('GET', 'http://www.google.com', true);
	request.responseType = 'blob';
	request.abort();
	return request.responseType === 'blob';
}, true);

add('node-buffer', 'Buffer' in global && typeof global.Buffer === 'function', true);

add('fetch', 'fetch' in global && typeof global.fetch === 'function', true);

add('web-worker-xhr-upload', new Promise((resolve) => {
	try {
		if (global.Worker !== undefined && global.URL && global.URL.createObjectURL) {
			const blob = new Blob([ `(function () {
self.addEventListener('message', function () {
	var xhr = new XMLHttpRequest();
	try {
		xhr.upload;
		postMessage('true');
	} catch (e) {
		postMessage('false');
	}
});
		})()` ], { type: 'application/javascript' });
			const worker = new Worker(URL.createObjectURL(blob));
			worker.addEventListener('message', ({ data: result }) => {
				resolve(result === 'true');
			});
			worker.postMessage({});
		} else {
			resolve(false);
		}
	} catch (e) {
		// IE11 on Winodws 8.1 encounters a security error.
		resolve(false);
	}
}), true);
