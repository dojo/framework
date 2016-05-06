import { assign } from 'dojo-core/lang';

class Dijit {
	constructor(params: { [param: string]: any; }, srcNodeRef?: Node | string) {
		if (params && params['throws']) {
			throw new Error('Ooops!!!');
		}
		if (typeof srcNodeRef === 'string') {
			srcNodeRef = document.getElementById(<string> srcNodeRef);
		}
		this.srcNodeRef = <HTMLElement> srcNodeRef;
		this.domNode = <HTMLElement> srcNodeRef;
		this.params = assign({}, params);
	};
	srcNodeRef: HTMLElement;
	domNode: HTMLElement;
	_startupCalled: number = 0;
	startup() { this._startupCalled++; };
	_destroyCalled: number = 0;
	destroy(preserveDom?: boolean) { this._destroyCalled++; };
	params: any;
}

namespace Dijit { }

export = Dijit;
