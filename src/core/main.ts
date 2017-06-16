import * as aspect from './aspect';
import DateObject from './DateObject';
import Evented from './Evented';
import global from './global';
import IdentityRegistry from './IdentityRegistry';
import * as lang from './lang';
import * as base64 from './base64';
import load from './load';
import MatchRegistry from './MatchRegistry';
import on, { emit } from './on';
import * as queue from './queue';
import request from './request';
import Scheduler from './Scheduler';
import * as stringExtras from './stringExtras';
import * as text from './text';
import UrlSearchParams from './UrlSearchParams';
import * as util from './util';

import * as iteration from './async/iteration';
import Task from './async/Task';
import * as timing from './async/timing';

const async = {
	iteration,
	Task,
	timing
};

export {
	aspect,
	async,
	base64,
	DateObject,
	emit,
	Evented,
	global,
	IdentityRegistry,
	lang,
	load,
	MatchRegistry,
	on,
	queue,
	request,
	Scheduler,
	stringExtras,
	text,
	UrlSearchParams,
	util
};
