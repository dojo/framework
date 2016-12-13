import has, { add } from '../has';
import global from '../global';

add('node-buffer', 'Buffer' in global && typeof global.Buffer === 'function');

add('fetch', 'fetch' in global && typeof global.fetch === 'function');

export default has;
