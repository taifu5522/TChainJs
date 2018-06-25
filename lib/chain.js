'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * 判断对象类型
 */
function is(obj, type) {
  if (!type) {
    return Object.prototype.toString.call(obj).split(' ')[1].split(']')[0];
  } else {
    return Object.prototype.toString.call(obj) === '[object ' + type + ']';
  }
}

/**
 * par = ['a','b','c']
 */
var get = function get(data, par, resualt) {
  var value = data;
  try {
    if (is(par, 'Array')) {
      for (var i = 0; i < par.length; i++) {
        var key = par[i];
        if (value[key] !== undefined && value[key] !== null) {
          value = value[key];
        } else {
          value = resualt !== undefined ? resualt : undefined;
          return value;
        }
      }
      return value;
    }
  } catch (e) {
    console.error('get\u65B9\u6CD5\u83B7\u53D6\u6570\u636E\u51FA\u9519\uFF1A' + e.message);
    console.error(e.stack);
    return false;
  }
  return false;
};

/**
 * 为实例添加方法
 */
function bindHandler(name, fn) {
  var _this = this;

  this[name + 'Handler'] = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var resualt = fn.apply(_this, args);
    if (resualt !== undefined && resualt !== null) {
      _this.resualt = resualt;
    }
    _this.next();
  };
  this[name] = function (val) {
    _this.queue.push([_this[name + 'Handler'], val]);
    return _this;
  };
}

/**
 * 任务链 By quchao
 * 以流的方式管理复杂的业务嵌套关系
 * 为了简洁且减少体积，只实现了少数几个接口，可以有效的解决多重if嵌套可读性可维护性差的问题
 * tips: WXObject类型表示页面或组件的实例，即页面或组件的js文件中的this
 * @interface send(val:Any) : this 立即送出一个数据，送出的数据只能是同步的
 * @interface map(arr:Array) : this 接收一个数组，并使用数组的每一个元素作为初始值执行整个任务链，map方法只能作为任务链第一个调用的方法
 * @interface task(fn:Function) : this 自定义一个任务，当任务执行到当前节点时，会调用自定义任务，自定义任务的返回值将会传递给下一个任务节点
 * @interface promise(promiseGenerator:(Promise|Function|Array)) : this 定义一个异步任务，当任务执行到当前节点时，将会自动执行promise的then，并将then返回的值传递给下一个任务节点
 * @interface delay(time:Number) : this 延迟一定时间再执行之后的任务
 * @interface setData(data:Object, [context:WXObject]) : this 封装setData方法，使其可以在任务链中线性的执行任务
 * @interface when(condition:Boolean) : this 当输入的表达式或变量为true时，才会继续向下进行。否则中断任务链。若传入的参数是一个function，则会使用function调用后的返回值做判断。传入的function的参数为执行到此任务为止的结果
 * @interface wxQuery(select:String) : this 封装小程序选择节点的方法
 * @interface queryIn(context:Object) : this 设置wx.createSelectorQuery().in方法绑定的作用域，必须搭配wxQuery使用
 * @interface subsctibe(success:(Object|Function), [fail:Function], [complete:Function]) : void 定义任务链的observer，详见subsctibe方法的详细说明文档
 * @interface fail(fn:Function) : this 提供简洁的方式注册fail方法
 * @interface start() : viod 开始执行任务链，如果不调用此方法，则不会执行整个任务。这是为了方便组合多个任务链。因此任务链的执行是惰性的，只有在需要执行此链时，调用此方法才会执行
 */

var Chain = function () {
  function Chain() {
    var _this2 = this;

    _classCallCheck(this, Chain);

    this.id = null;
    this.queue = [];
    this.before = null;
    this.observer = {};
    this.allreadyUse = [];
    this.implementQueue = [];
    this.timer = null;
    this.resualt = null;
    this.queryNodeContext = null;
    this.setDataContext = null;
    this.mapArr = [];
    this.tempChain = null;
    this.mapEndHandler = null;
    this.isBreak = false;
    this.orHandles = {};
    if (is(this.toDoInstantiated, 'Array')) {
      this.toDoInstantiated.map(function (item) {
        bindHandler.apply(_this2, item);
      });
    }
  }

  _createClass(Chain, [{
    key: 'createTempChain',
    value: function createTempChain() {
      var _this3 = this;

      this.tempChain = new Chain();
      this.tempChain.queue = [].concat(_toConsumableArray(this.queue));
      this.tempChain.queue.unshift([this.sendHandler, this.mapArr.shift()]);
      this.tempChain.subscribe({
        complete: function complete() {
          if (_this3.mapArr.length) {
            _this3.createTempChain();
            _this3.tempChain.start();
          } else {
            if (typeof _this3.mapEndHandler === 'function') {
              _this3.mapEndHandler();
            }
          }
        }
      }).start();
    }

    /**
     * 开始执行任务链，在此方法调用前，可以任意的编写任务。
     * 当此方法调用时，会线性的执行任务。
     * 任务链完成后，调用过的任务会保存在allreadyUse队列中，方便调试时进行回溯
     */

  }, {
    key: 'start',
    value: function start() {
      if (this.mapArr.length) {
        this.createTempChain();
      } else {
        this.implementQueue = [].concat(_toConsumableArray(this.queue));
        this.queue = [];
        this.next();
      }
    }
  }, {
    key: 'completeHandler',
    value: function completeHandler() {
      var complete = this.observer.complete;

      if (complete && typeof complete === 'function') {
        complete();
      }
    }
  }, {
    key: 'successHandler',
    value: function successHandler() {
      var success = this.observer.success;

      if (success && typeof success === 'function') {
        success(this.resualt);
      }
    }

    /**
     * 调用下一个任务节点
     */

  }, {
    key: 'next',
    value: function next() {
      if (this.isBreak) {
        this.completeHandler();
        return false;
      }
      if (!this.implementQueue.length) {
        this.successHandler();
        this.completeHandler();
        this.setDataContext = null;
        return false;
      };
      try {
        var o = this.implementQueue.shift();

        var _o = _slicedToArray(o, 2),
            fn = _o[0],
            val = _o[1];

        this.allreadyUse.push(o);
        var _val = val;
        if (!is(_val, 'Array')) {
          _val = [_val];
        }
        fn.apply(this, _val);
      } catch (e) {
        if (this.observer.fail && typeof this.observer.fail === 'function') {
          this.observer.fail(e);
        } else {
          throw new Error(e);
        }
      }
    }

    /**
     * 接收一个数组，并使用数组的每一个元素作为初始值执行整个任务链。
     * map方法只能作为任务链第一个调用的方法
    */

  }, {
    key: 'map',
    value: function map(arr) {
      var option = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (this.queue.length) {
        this.failHandler(new Error('CallError: map method Only the first call.'));
      }
      this.mapArr = arr;
      return this;
    }
  }, {
    key: 'mapEnd',
    value: function mapEnd(fn) {
      if (typeof fn !== 'function') {
        this.failHandler(new Error('TypeError: mapEndHandler mast be an function.'));
      }
      this.mapEndHandler = fn;
      return this;
    }

    /**
     * 送出一条数据给下一个任务节点
     * @param {Any} val 需要送出的信息
     * @next  {Any} 同val
     */

  }, {
    key: 'send',
    value: function send(val) {
      this.queue.push([this.sendHandler, val]);
      return this;
    }

    /**
     * 将of注册的数据发送给下一个任务节点
     * @param {Any} val 需要送出的信息
     */

  }, {
    key: 'sendHandler',
    value: function sendHandler(val) {
      if (typeof val === 'undefined') {
        this.next();
        return;
      }
      this.resualt = val;
      this.next();
    }

    /**
     * 当输入的表达式或变量为true时，才会继续向下进行。否则中断任务链
     * 若传入的参数是一个function，则会使用function调用后的返回值做判断。传入的function的参数为执行到此任务为止的结果
     * @param { Boolean | Function | Array } condition 判断条件，若传入函数，则以函数的返回值作为判断条件；若传入数组，则数组为一个length为2的数组，其中第一个值为判断条件，第二个值为name
     */

  }, {
    key: 'when',
    value: function when(condition) {
      this.queue.push([this.whenHandler, condition]);
      return this;
    }
  }, {
    key: 'whenHandler',
    value: function whenHandler(condition, name) {
      var handle = name ? name === 'otherwiseHnadle' ? this.otherwiseHnadle : this.orHandles[name] : this.otherwiseHnadle;
      if (typeof condition === 'function') {
        var state = this.getWhenResult(condition, 'otherwiseHnadle');
        if (state) return this.next();
      } else if (name) {
        if (typeof condition === 'function') {
          var _state = this.getWhenResult(condition, name);
          if (_state) return this.next();
        } else if (condition) {
          return this.next();
        }
        return this.$otherwiseHnadle(handle, name);
      } else if (condition) {
        this.next();
        return;
      }
      this.$otherwiseHnadle(handle, 'otherwiseHnadle');
    }
  }, {
    key: 'getWhenResult',
    value: function getWhenResult(fn, handleName) {
      var state = fn(this.resualt);
      var handle = handleName === 'otherwiseHnadle' ? this.otherwiseHnadle : this.orHandles[handleName];
      if (state) {
        return state;
      } else {
        this.$otherwiseHnadle(handle, handleName);
      }
    }
  }, {
    key: '$otherwiseHnadle',
    value: function $otherwiseHnadle(handle, handleName) {
      var chain = handle && handle(this.resualt);
      if (chain instanceof Chain) {
        chain.break();
        this.transfer(chain);
      }
      if (handleName === 'otherwiseHnadle') {
        this['otherwiseHnadle'] = null;
      }
    }
  }, {
    key: 'or',
    value: function or(fn, name) {
      if (name) {
        if (name === 'otherwiseHnadle' || name === '$otherwiseHnadle') this.failHandler(new Error("ParamError:'otherwiseHnadle' is a reserved word"));
        this.orHandles[name] = fn;
      } else {
        this.otherwiseHnadle = fn;
      }
      return this;
    }

    /**
     * 延迟一定时间后再继续执行之后的任务节点
     * @param {Number} time 需要延迟的时间 以毫秒计算
     */

  }, {
    key: 'delay',
    value: function delay(time) {
      var newTime = parseInt(time);
      if (typeof newTime !== 'number' || isNaN(newTime)) {
        this.failHandler(new Error('TypeError:delay time mast be an number'));
      }
      this.queue.push([this.delayHandler, newTime]);
      return this;
    }
  }, {
    key: 'delayHandler',
    value: function delayHandler(time) {
      var _this4 = this;

      this.timer = setTimeout(function () {
        _this4.next();
      }, time);
    }

    /**
     * 清除还未执行的delay以及之后的任务
     */

  }, {
    key: 'unDelay',
    value: function unDelay(chain) {
      if (chain instanceof Chain) {
        clearTimeout(chain.timer);
        return this;
      }
      clearTimeout(this.timer);
      return this;
    }

    /**
     * 封装setData方法，使其可以在任务链中线性的执行任务
     * @param {Object|Function} data 需要改变的值，如果传入的是一个function，则会将function调用后的返回值作为setData的参数传入
     * @param {WXObject} context 组件或页面的实例，一旦传入后，在任务链的整个生命周期里都会持续生效，直到下一次调用setData方法时传入新的值或任务链执行结束后重置为null
     */

  }, {
    key: 'setData',
    value: function setData(data, context) {
      this.queue.push([this.setDataHandle, [data, context]]);
      return this;
    }
  }, {
    key: 'setDataHandle',
    value: function setDataHandle(data, context) {
      var _this5 = this;

      if (!context && !this.setDataContext) this.failHandler(new Error('ParameterError:context is necessary'));
      if (!data) this.failHandler(new Error('ParameterError:data is necessary'));
      if (context) {
        this.setDataContext = context;
      }
      var newData = data;
      if (typeof data === 'function') {
        newData = data(this.resualt);
      }
      this.setDataContext.setData(newData, function () {
        _this5.next();
      });
    }

    /**
     * 封装小程序选择节点的方法
     * @param {String} select 选择器
     */

  }, {
    key: 'wxQuery',
    value: function wxQuery(select) {
      if (!is(select, 'String')) {
        this.failHandler(new Error('TypeError:select mast be an String'));
      };
      this.queue.push([this.wxQueryHandler, select]);
      return this;
    }

    /**
     * 设置wx.createSelectorQuery().in方法绑定的作用域，必须搭配wxQuery使用
     * @param {Object} context wx.createSelectorQuery().in方法绑定的作用域
     */

  }, {
    key: 'queryIn',
    value: function queryIn(context) {
      if (!is(context, 'Object')) {
        this.failHandler(new Error('TypeError:context mast be an Object'));
      }
      this.queryNodeContext = context;
      return this;
    }
  }, {
    key: 'wxQueryHandler',
    value: function wxQueryHandler(select) {
      var _this6 = this;

      var query = null;
      if (this.queryNodeContext) {
        query = wx.createSelectorQuery().in(this.queryNodeContext);
        this.queryNodeContext = null;
      } else {
        query = wx.createSelectorQuery();
      }
      query.select(select).boundingClientRect(function (res) {
        _this6.resualt = res;
        _this6.next();
      }).exec();
    }

    /**
     * 自定义一条任务
     * @param  {Function} fn 需要执行的自定义任务
     * @next   {Any} 需要送出的数据
     */

  }, {
    key: 'task',
    value: function task(fn) {
      if (typeof fn !== 'function') {
        this.failHandler(new Error('TypeError:task callback mast be an function'));
      };
      this.queue.push([this.taskHandler, fn]);
      return this;
    }

    /**
     * 对任务链中的自定义任务进行处理
     * @param {Function} fn 自定义任务
     */

  }, {
    key: 'taskHandler',
    value: function taskHandler(fn) {
      if (typeof fn !== 'function') return;
      var resualt = fn(this.resualt);
      if (resualt instanceof Chain) {
        this.transfer(resualt);
        return;
      }
      if (resualt !== undefined && resualt !== null) {
        this.resualt = resualt;
      }
      this.next();
    }

    /**
     * 转换任务链
     */

  }, {
    key: 'transfer',
    value: function transfer(chain) {
      var _this7 = this;

      chain.resualt = this.resualt;
      chain.implementQueue = [].concat(_toConsumableArray(chain.queue));
      chain.observer.success = this.observer.success;
      chain.queue = [];
      chain.setDataContext = this.setDataContext;
      chain.observer.complete = function () {
        if (chain.isBreak) {
          _this7.completeHandler();
          return;
        }
        _this7.resualt = chain.resualt;
        _this7.next();
      };
      chain.next();
    }

    /**
     * 中断任务链，中断任务链并调用complete方法
     */

  }, {
    key: 'break',
    value: function _break() {
      this.isBreak = true;
      return this;
    }

    /**
     * 接收一个promise，并将promise返回的数据传送给下一个任务
     * @param {Promise | Function | Array} promiseGenerator 接收到的promise对象，或一个可以返回primise的函数，或一个Promise数组，用来调用Promise.all执行并发请求
     * @next  {Any}                                         需要送出的数据
     */

  }, {
    key: 'promise',
    value: function promise(promiseGenerator) {
      this.queue.push([this.promiseHandler, promiseGenerator]);
      return this;
    }

    /**
     * 对任务链中的primise节点进行处理
     * @param {Promise | Function} promise 
     */

  }, {
    key: 'promiseHandler',
    value: function promiseHandler(promise) {
      var _this8 = this;

      try {
        var _promise = null;
        if (promise instanceof Promise) {
          _promise = promise;
        } else if (is(promise, 'Array')) {
          _promise = Promise.all(promise);
        } else {
          _promise = promise(this.resualt);
        }
        _promise.then(function (data) {
          _this8.resualt = data;
          _this8.next();
        }).catch(function (e) {
          _this8.failHandler(e);
        });
      } catch (err) {
        this.failHandler(err);
      }
    }

    /**
     * 错误处理函数
     * 调用observer的fail函数，如果fail函数返回true，则调用完成后继续抛出错误。
     * 如果没有指定fail函数，则直接抛出错误
     * @param {Error} e error对象
     */

  }, {
    key: 'failHandler',
    value: function failHandler(e) {
      if (typeof this.observer.fail === 'function') {
        var failResualt = this.observer.fail(e);
        if (this.observer.complete && typeof this.observer.complete === 'function') {
          this.observer.complete();
        }
        if (failResualt == true) {
          console.error(e);
          // throw new Error(e);
        }
      } else {
        console.error(e);
        // throw new Error(e);
      }
    }

    /**
     * 注册一个observer
     * 一个observer对象允许拥有三个方法：
     * success  当整个任务链所有任务成功完成时，调用此函数，参数为最终的处理结果
     * fail     当某一个任务失败或发生异常错误时，调用此函数，参数为错误对象
     * complete 当任务链停止调用时，不管结果成功还是失败，皆调用此函数，此函数为无参函数
     * @param {Object | Function} success  observer对象，当类型为函数时，则视为observer的success方法
     * @param {Function}          fail     当第一个参数是Object类型时自动忽略，observer对象的fail方法
     * @param {Function}          complete 当第一个参数是Object类型时自动忽略，observer对象的complete方法
     */

  }, {
    key: 'subscribe',
    value: function subscribe(success, fail, complete) {
      if (!success) {
        throw new Error('ParameterError:seccess functional must pass');
      }
      if (is(success, 'Object')) {
        this.observer = success;
        return this;
      }
      if (!fail && typeof success === 'function') {
        this.observer.success = success;
      } else if (fail && typeof fail === 'function' && !complete) {
        this.observer.success = success;
        this.observer.fail = fail;
      } else if (complete && complete === 'function') {
        this.observer.success = success;
        this.observer.fail = fail;
        this.observer.complete === complete;
      };
      return this;
    }

    /**
     * 提供简洁的方式注册fail方法
     * @param {Function} fn 错误回调函数
     */

  }, {
    key: 'fail',
    value: function fail(fn) {
      if (typeof fn !== 'function') {
        throw new Error('fail callback mast be an function');
      }
      this.observer.fail = fn;
      return this;
    }

    /**
     * 注册原型方法
     * 调用此方法来为类添加原型方法
     * 如果注册的原型方法在调用后返回的值不为undefined或null，则会作为resualt传给下一个任务
     * @param {String}   name 方法名
     * @param {Function} fn   处理函数
     */

  }], [{
    key: 'extend',
    value: function extend(name, fn) {
      if (!is(this.prototype.toDoInstantiated, 'Array')) {
        this.prototype.toDoInstantiated = [];
      }
      this.prototype.toDoInstantiated.push([name, fn]);
    }
  }]);

  return Chain;
}();

/**
 * 提供简单的方法创建任务链
 */


var send = exports.send = function send(val) {
  return new Chain().send(val);
};
var task = exports.task = function task(fn) {
  return new Chain().task(fn);
};
var promise = exports.promise = function promise(_promise2) {
  return new Chain().promise(_promise2);
};
var extend = exports.extend = function extend(name, fn) {
  Chain.extend(name, fn);
};
var delay = exports.delay = function delay(time) {
  return new Chain().delay(time);
};
var setData = exports.setData = function setData(data, context) {
  return new Chain().setData(data, context);
};
var when = exports.when = function when(condition) {
  return new Chain().when(condition);
};
var map = exports.map = function map(arr) {
  return new Chain().map(arr);
};
var wxQuery = exports.wxQuery = function wxQuery(select) {
  return new Chain().wxQuery(select);
};
var unDelay = exports.unDelay = function unDelay(chain) {
  return new Chain().unDelay(chain);
};

exports.default = Chain;

// module.exports = {
//   send:val => new Chain().send(val),
//   task:fn => new Chain().task(fn),
//   promise:promise => new Chain().promise(promise),
//   extend:(name, fn) => {
//     Chain.extend(name, fn);
//   },
//   delay:time => new Chain().delay(time),
//   setData:(data, context) => new Chain().setData(data, context),
//   when:condition => new Chain().when(condition),
//   map:arr => new Chain().map(arr),
//   wxQuery:select => new Chain().wxQuery(select),
//   unDelay:chain => new Chain().unDelay(chain),
//   default:Chain
// }