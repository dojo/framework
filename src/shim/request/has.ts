import has, { add } from '../has';
import global from '../global';

add('node-buffer', () => { 'Buffer' in global && typeof global.Buffer === 'function'; });

export default has;
