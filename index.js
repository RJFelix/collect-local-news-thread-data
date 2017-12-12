const fs = require('fs');

const getLnThreads = require('./src/get-ln-threads');
const analyzeThread = require('./src/analyze-thread');

const threads = getLnThreads();

threads.then(threadArr => {
  return Promise.all(threadArr.map(analyzeThread));
  //return Promise.all(threadArr.map(analyzeThread))
})
.then(results => {
  const header = Object.keys(results[0]).reduce((str, key) => str + key + ',', '').slice(0, -1);
  const body = results.map(result => Object.values(result).reduce((str, val) => str + val + ',', '').slice(0, -1))
                      .reduce(intersperse('\n'), []);
  const output = header.concat(body);
  fs.writeFile('results.csv', output, err => console.error(err));
})
.catch(err => console.error(err));

const flatten = (av, cv) => av.concat(cv);
const intersperse = i => (av, cv) => av + i + cv;