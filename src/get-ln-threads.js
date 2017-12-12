const superagent = require('superagent');

function getLnThreads() {
  const page1 = superagent.get('https://www.reddit.com/r/politics/search.json?q=%22What+happened+in+your+state+last+week%22&restrict_sr=on&sort=new')
  const page2 = superagent.get('https://www.reddit.com/r/politics/search.json?q=%22What+happened+in+your+state+last+week%22&restrict_sr=on&sort=new&after=t3_6jmik1')
  const page3 = superagent.get('https://www.reddit.com/r/politics/search.json?q=%22What+happened+in+your+state+last+week%22&restrict_sr=on&sort=new&after=t3_5oc2vx')
  return Promise.all([page1, page2, page3].map(parse))
    .then(pages => pages.reduce(flatten, []).filter(it => !Number.isNaN(parseInt(it.number))).sort((a, b) => a.number - b.number))
}

const parse = prom => {
  return prom.then(res => {
    return res.body.data.children.map(child => ({
      timestamp: new Date(child.data.created_utc * 1000),
      number: child.data.title.split(' ').pop(),
      id: child.data.name,
      link: `https://www.reddit.com${child.data.permalink}`,
      jsonLink: `https://www.reddit.com${child.data.permalink.slice(0, -1)}.json`,
    }))
  });
}

const flatten = (av, cv) => av.concat(cv);


module.exports = getLnThreads;
