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
