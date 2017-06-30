import global from '@dojo/shim/global';
import has, { add } from '@dojo/shim/support/has';

export * from '@dojo/shim/support/has';
export default has;

add('object-assign', typeof global.Object.assign === 'function');

add('arraybuffer', typeof global.ArrayBuffer !== 'undefined');
add('formdata', typeof global.FormData !== 'undefined');
add('filereader', typeof global.FileReader !== 'undefined', true);
add('xhr', typeof global.XMLHttpRequest !== 'undefined');
add('xhr2', has('xhr') && 'responseType' in global.XMLHttpRequest.prototype);
add('blob', function () {
	if (!has('xhr2')) {
		return false;
	}

	const request = new global.XMLHttpRequest();
	request.open('GET', 'http://www.google.com', true);
	request.responseType = 'blob';
	request.abort();
	return request.responseType === 'blob';
});

add('node-buffer', 'Buffer' in global && typeof global.Buffer === 'function');

add('fetch', 'fetch' in global && typeof global.fetch === 'function');
