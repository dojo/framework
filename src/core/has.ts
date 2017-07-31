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
