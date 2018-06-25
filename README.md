# TChainJs

一个微型的异步迭代器类库，使用链式调用的方式，以同步的逻辑编写异步代码。

## Install

```
npm i --save tchain
```

## Use

```
import Chain from 'tchain';

const chain = new Chain()

chain.send(1)
  .subscribe(data => {
    console.log(data)
  })
  .start();
```

## Documentation

https://legacy.gitbook.com/book/taifu5522/chainjs-documentation/details
