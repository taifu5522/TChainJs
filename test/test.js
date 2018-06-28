const Chain = require('../lib/chain').default;

const chain = new Chain()
chain
.task(() => {
  console.log('begin test')
})
.when([false, 'aaa'])
.or(() => {
  console.log('asdasd')
}, 'aaa')
.start()

Chain.extend('asd', function(a) {
  console.log(arguments)
  console.log(arguments[arguments.length-1]);
})

const chain2 = new Chain()
  .send(1)
  .asd('asd')
  .start()
