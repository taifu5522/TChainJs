
/**
 * 判断对象类型
 */
function is(obj, type) {
  if (!type) {
      return Object.prototype.toString.call(obj).split(' ')[1].split(']')[0];
  } else {
      return Object.prototype.toString.call(obj) === `[object ${type}]`;
  }
}

/**
 * par = ['a','b','c']
 */
const get = (data, par, resualt) => {
  let value = data;
  try{
      if (is(par, 'Array')) {
          for (let i = 0; i < par.length; i++) {
              const key = par[i];
              if (value[key] !== undefined && value[key] !== null) {
                  value = value[key];
              } else {
                  value = resualt !== undefined ? resualt : undefined;
                  return value;
              }
          }
          return value;
      }
  }catch(e){
      console.error(`get方法获取数据出错：${e.message}`)
      console.error(e.stack);
      return false;
  }
  return false;
}

/**
 * 为实例添加方法
 */
function bindHandler(name, fn) {
  this[`${name}Handler`] = (...args) => {
    args[args.length] = this.resualt;
    const resualt = fn.apply(this, args);
    if (resualt !== undefined && resualt !== null) {
      this.resualt = resualt;
    }
    this.next();
  };
  this[name] = (val) => {
    this.queue.push([this[`${name}Handler`], val]);
    return this;
  }
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
class Chain {
  constructor() {
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
      this.toDoInstantiated.map(item => {
        bindHandler.apply(this, item);
      })
    }
  }

  createTempChain() {
    this.tempChain = new Chain();
    this.tempChain.queue = [...this.queue];
    this.tempChain.queue.unshift([this.sendHandler, this.mapArr.shift()]);
    this.tempChain.subscribe({
      complete: () => {
        if (this.mapArr.length) {
          this.createTempChain();
          this.tempChain.start();
        } else {
          if (typeof this.mapEndHandler === 'function') {
            this.mapEndHandler()
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
  start() {
    if (this.mapArr.length) {
      this.createTempChain();
    } else {
      this.implementQueue = [...this.queue];
      this.queue = [];
      this.next();
    }
  }

  completeHandler() {
    const { complete } = this.observer;
    if (complete && typeof complete === 'function') {
      complete();
    }
  }

  successHandler() {
    const { success } = this.observer;
    if (success && typeof success === 'function') {
      success(this.resualt);
    }
  }

  /**
   * 调用下一个任务节点
   */
  next() {
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
      const o = this.implementQueue.shift();
      const [fn, val] = o;
      this.allreadyUse.push(o);
      let _val = val;
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
  map(arr, option = {}) {
    if (this.queue.length) {
      this.failHandler(new Error('CallError: map method Only the first call.'));
    }
    this.mapArr = arr;
    return this;
  }

  mapEnd(fn) {
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
  send(val) {
    this.queue.push([this.sendHandler, val]);
    return this;
  }

  /**
   * 将of注册的数据发送给下一个任务节点
   * @param {Any} val 需要送出的信息
   */
  sendHandler(val) {
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
  when(condition) {
    this.queue.push([this.whenHandler, condition]);
    return this;
  }

  whenHandler(condition, name) {
    const handle = name ? name === 'otherwiseHnadle' ? this.otherwiseHnadle : this.orHandles[name] : this.otherwiseHnadle;
    if (typeof condition === 'function') {
      const state = this.getWhenResult(condition, 'otherwiseHnadle')
      if(state) return this.next()
    } else if(name){
      if(typeof condition === 'function'){
        const state = this.getWhenResult(condition, name)
        if(state) return this.next()
      }else if(condition){
        return this.next();
      }
      return this.$otherwiseHnadle(handle, name);
    }else if (condition) {
      this.next();
      return;
    }
    this.$otherwiseHnadle(handle, 'otherwiseHnadle')
  }

  getWhenResult(fn, handleName){
    const state = fn(this.resualt);
    const handle = handleName === 'otherwiseHnadle' ? this.otherwiseHnadle : this.orHandles[handleName];
    if (state) {
      return state;
    } else {
      this.$otherwiseHnadle(handle, handleName)
    }
  }

  $otherwiseHnadle(handle, handleName){
    const chain = handle && handle(this.resualt);
    if (chain instanceof Chain) {
      chain.break();
      this.transfer(chain)
    }
    if(handleName === 'otherwiseHnadle'){
      this['otherwiseHnadle'] = null;
    }
  }

  or(fn, name) {
    if(name){
      if(name === 'otherwiseHnadle' || name === '$otherwiseHnadle') this.failHandler(new Error("ParamError:'otherwiseHnadle' is a reserved word"));
      this.orHandles[name] = fn;
    }else{
      this.otherwiseHnadle = fn;
    }
    return this;
  }

  /**
   * 延迟一定时间后再继续执行之后的任务节点
   * @param {Number} time 需要延迟的时间 以毫秒计算
   */
  delay(time) {
    const newTime = parseInt(time);
    if (typeof newTime !== 'number' || isNaN(newTime)) {
      this.failHandler(new Error('TypeError:delay time mast be an number'));
    }
    this.queue.push([this.delayHandler, newTime]);
    return this;
  }

  delayHandler(time) {
    this.timer = setTimeout(() => {
      this.next();
    }, time);
  }

  /**
   * 清除还未执行的delay以及之后的任务
   */
  unDelay(chain) {
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
  setData(data, context) {
    this.queue.push([this.setDataHandle, [data, context]]);
    return this;
  }

  setDataHandle(data, context) {
    if (!context && !this.setDataContext) this.failHandler(new Error('ParameterError:context is necessary'))
    if (!data) this.failHandler(new Error('ParameterError:data is necessary'))
    if (context) {
      this.setDataContext = context;
    }
    let newData = data;
    if (typeof data === 'function') {
      newData = data(this.resualt);
    }
    this.setDataContext.setData(newData, () => {
      this.next();
    })
  }

  /**
   * 封装小程序选择节点的方法
   * @param {String} select 选择器
   */
  wxQuery(select) {
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
  queryIn(context) {
    if (!is(context, 'Object')) {
      this.failHandler(new Error('TypeError:context mast be an Object'));
    }
    this.queryNodeContext = context;
    return this;
  }

  wxQueryHandler(select) {
    let query = null;
    if (this.queryNodeContext) {
      query = wx.createSelectorQuery().in(this.queryNodeContext);
      this.queryNodeContext = null;
    } else {
      query = wx.createSelectorQuery();
    }
    query.select(select).boundingClientRect(res => {
      this.resualt = res;
      this.next();
    }).exec();
  }

  /**
   * 自定义一条任务
   * @param  {Function} fn 需要执行的自定义任务
   * @next   {Any} 需要送出的数据
   */
  task(fn) {
    if (typeof fn !== 'function') {
      this.failHandler(new Error('TypeError:task callback mast be an function'));
    };
    this.queue.push([this.taskHandler, fn])
    return this;
  }

  /**
   * 对任务链中的自定义任务进行处理
   * @param {Function} fn 自定义任务
   */
  taskHandler(fn) {
    if (typeof fn !== 'function') return;
    const resualt = fn(this.resualt);
    if (resualt instanceof Chain) {
      this.transfer(resualt)
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

  transfer(chain) {
    chain.resualt = this.resualt;
    chain.implementQueue = [...chain.queue];
    chain.observer.success = this.observer.success;
    chain.queue = [];
    chain.setDataContext = this.setDataContext;
    chain.observer.complete = () => {
      if (chain.isBreak) {
        this.completeHandler();
        return;
      }
      this.resualt = chain.resualt;
      this.next();
    }
    chain.next();
  }

  /**
   * 中断任务链，中断任务链并调用complete方法
   */
  break() {
    this.isBreak = true;
    return this;
  }

  /**
   * 接收一个promise，并将promise返回的数据传送给下一个任务
   * @param {Promise | Function | Array} promiseGenerator 接收到的promise对象，或一个可以返回primise的函数，或一个Promise数组，用来调用Promise.all执行并发请求
   * @next  {Any}                                         需要送出的数据
   */
  promise(promiseGenerator) {
    this.queue.push([this.promiseHandler, promiseGenerator]);
    return this;
  }

  /**
   * 对任务链中的primise节点进行处理
   * @param {Promise | Function} promise 
   */
  promiseHandler(promise) {
    try {
      let _promise = null;
      if (promise instanceof Promise) {
        _promise = promise;
      } else if (is(promise, 'Array')) {
        _promise = Promise.all(promise);
      } else {
        _promise = promise(this.resualt);
      }
      _promise.then(data => {
        this.resualt = data;
        this.next();
      }).catch(e => {
        this.failHandler(e);
      })
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
  failHandler(e) {
    if (typeof this.observer.fail === 'function') {
      const failResualt = this.observer.fail(e);
      if (this.observer.complete && typeof this.observer.complete === 'function') {
        this.observer.complete();
      }
      if (failResualt == true) {
        console.error(e)
        // throw new Error(e);
      }
    } else {
      console.error(e)
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
  subscribe(success, fail, complete) {
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
  fail(fn) {
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
  static extend(name, fn) {
    if (!is(this.prototype.toDoInstantiated, 'Array')) {
      this.prototype.toDoInstantiated = [];
    }
    this.prototype.toDoInstantiated.push([name, fn]);
  }
}

/**
 * 提供简单的方法创建任务链
 */
export const send = val => new Chain().send(val);
export const task = fn => new Chain().task(fn);
export const promise = promise => new Chain().promise(promise);
export const extend = (name, fn) => {
  Chain.extend(name, fn);
}
export const delay = time => new Chain().delay(time);
export const setData = (data, context) => new Chain().setData(data, context);
export const when = condition => new Chain().when(condition);
export const map = arr => new Chain().map(arr);
export const wxQuery = select => new Chain().wxQuery(select);
export const unDelay = chain => new Chain().unDelay(chain);

export default Chain;

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
