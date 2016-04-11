export * from 'dojo-core/has';
import { add } from 'dojo-core/has';
import global from 'dojo-core/global';

add('dom-requestanimationframe', 'requestAnimationFrame' in global);

add('dom-classlist', 'document' in global && 'classList' in document.documentElement);
