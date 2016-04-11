(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", 'dojo-core/WeakMap'], factory);
    }
})(function (require, exports) {
    "use strict";
    var WeakMap_1 = require('dojo-core/WeakMap');
    (function (AdviceType) {
        AdviceType[AdviceType["Before"] = 0] = "Before";
        AdviceType[AdviceType["After"] = 1] = "After";
        AdviceType[AdviceType["Around"] = 2] = "Around";
    })(exports.AdviceType || (exports.AdviceType = {}));
    var AdviceType = exports.AdviceType;
    ;
    var dispatchAdviceMap = new WeakMap_1.default();
    function getDispatcher(joinPoint) {
        function dispatcher() {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var adviceMap = dispatchAdviceMap.get(dispatcher);
            if (adviceMap.before) {
                args = adviceMap.before.reduce(function (previousArgs, advice) {
                    var currentArgs = advice.apply(_this, previousArgs);
                    return currentArgs ? currentArgs : previousArgs;
                }, args);
            }
            var result = adviceMap.joinPoint.apply(this, args);
            if (adviceMap.after) {
                result = adviceMap.after.reduce(function (previousResult, advice) {
                    return advice.apply(_this, [previousResult].concat(args));
                }, result);
            }
            return result;
        }
        dispatchAdviceMap.set(dispatcher, {
            joinPoint: joinPoint
        });
        return dispatcher;
    }
    function advise(joinPoint, type, advice) {
        var dispatcher = joinPoint;
        if (type === AdviceType.Around) {
            dispatcher = getDispatcher(advice.apply(this, [joinPoint]));
        }
        else {
            if (!dispatchAdviceMap.has(joinPoint)) {
                dispatcher = getDispatcher(joinPoint);
            }
            var adviceMap = dispatchAdviceMap.get(dispatcher);
            if (type === AdviceType.Before) {
                (adviceMap.before || (adviceMap.before = [])).unshift(advice);
            }
            else {
                (adviceMap.after || (adviceMap.after = [])).push(advice);
            }
        }
        return dispatcher;
    }
    function before(joinPoint, advice) {
        return advise(joinPoint, AdviceType.Before, advice);
    }
    exports.before = before;
    function after(joinPoint, advice) {
        return advise(joinPoint, AdviceType.After, advice);
    }
    exports.after = after;
    function around(joinPoint, advice) {
        return advise(joinPoint, AdviceType.Around, advice);
    }
    exports.around = around;
});
//# sourceMappingURL=_debug/aspect.js.map