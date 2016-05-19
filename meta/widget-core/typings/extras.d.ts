declare module 'rxjs/Rx' {
	export * from '@reactivex/RxJS';
}

declare module 'rxjs/Observable' {
	import * as Observable from '@reactivex/RxJS/dist/cjs/Observable';
	export = Observable;
}

declare module 'rxjs/Observer' {
	import * as Observer from '@reactivex/RxJS/dist/cjs/Observer';
	export = Observer;
}

declare module 'immutable/immutable' {
	export * from 'immutable';
}

declare module 'maquette/maquette' {
	export * from 'maquette';
}
