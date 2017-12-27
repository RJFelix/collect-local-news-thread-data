const fs = require('fs');

const getLnThreads = require('./src/get-ln-threads');
const analyzeThread = require('./src/analyze-thread');

const threads = getLnThreads();

threads.then(threadArr => {
  return Promise.all(threadArr.map(analyzeThread));
  //return Promise.all(threadArr.map(analyzeThread))
})
.then(results => {
  const header = Object.keys(results[0]).join(',');
  const body = results.map(result => Object.values(result).join(','))
                      .join('\n');
  const output = [header, body].join('\n');
  fs.writeFile('results.csv', output, err => console.error(err));
})
.catch(err => console.error(err));

const flatten = (av, cv) => av.concat(cv);