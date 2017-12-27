const superagent = require('superagent');

const states = new Set(
  ["Alabama", "Alaska", "American Samoa", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District Of Columbia", "Federated States Of Micronesia", "Florida", "Georgia", "Guam", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Marshall Islands", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Northern Mariana Islands", "Ohio", "Oklahoma", "Oregon", "Palau", "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virgin Islands", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"]
);

const analyzeThread = thread => {
  return superagent.get(thread.jsonLink)
    .then(res => res.body)
    .then(body => {
      const result = {};
      const op = body[0].data.children[0].data;
      result.ThreadUpvotes = op.ups;
      result.Comments = op.num_comments;
      result.PageViews = op.view_count;
      result.DatePosted = new Date(op.created_utc * 1000);
      result.link = op.url;
      result.jsonLink = `${op.url.slice(0, -1)}.json`;
      const comments = body[1].data.children;
      result.NumTopLevelComments = comments.length;
      const categorizedComments = comments.map(categorizeComment).map(fixScore).sort((a, b) => b.data.ups - a.data.ups);
      // inconsistent variable names are per client requirement
      result.MostUpvotesState = categorizedComments[0].state;
      result.SecondMostUpvotedState = categorizedComments[1].state;
      result.ThirdMostUpvotedState = categorizedComments[2].state;
      result.MostUpvotesLink = makeLink(categorizedComments[0].data.permalink);
      result.SecondMostUpvotesLink = makeLink(categorizedComments[1].data.permalink);
      result.ThirdMostUpvotesLink = makeLink(categorizedComments[2].data.permalink);
      result.MostUpvotesVotes = categorizedComments[0].data.ups;
      result.SecondMostUpvotedVotes = categorizedComments[1].data.ups;
      result.ThirdMostUpvotedVotes = categorizedComments[2].data.ups;
      result.MostUpvotesAuthor = categorizedComments[0].data.author;
      result.SecondMostUpvotedAuthor = categorizedComments[1].data.author;
      result.ThirdMostUpvotedAuthor = categorizedComments[2].data.author;
      result.MostUpvotesTime = makeDate(categorizedComments[0].data.created_utc);
      result.SecondMostUpvotedTime = makeDate(categorizedComments[1].data.created_utc);
      result.ThirdMostUpvotedTime = makeDate(categorizedComments[2].data.created_utc);
      result.MostUpvotesText = fixText(categorizedComments[0].data.body || 'NO-BODY-0');
      result.SecondMostUpvotesText = fixText(categorizedComments[1].data.body || 'NO-BODY-1');
      result.ThirdMostUpvotesText = fixText(categorizedComments[2].data.body || 'NO-BODY-2');
      for(let state of states) {
        result[state] = categorizedComments.filter(comment => comment.state === state).length;
      }
      result.Unknown = categorizedComments.filter(comment => comment.state === 'Unknown').length;
      result.Indeterminate = categorizedComments.filter(comment => comment.state === 'Indeterminate').length;
      result.None = categorizedComments.filter(comment => comment.state === 'None').length;
      return result;
    })
}

const categorizeComment = comment => {
  if(!comment.data.body) {
    return {
      ...comment,
      state: 'None',
      method: 'Comment was empty, removed, or deleted.',
    }
  }
  const matches = []
  let flair = null;
  if(states.has(comment.data.author_flair_text)) {
    matches.push(comment.data.author_flair_text);
    flair = comment.data.author_flair_text;
  }
  for(let state of states) {
    if(comment.data.body.includes(state))
      matches.push(state);
  }
  if(matches.length === 0) {
    return {
      ...comment,
      state: 'Unknown',
      method: 'No state was present in post or flair.'
    }
  }
  if(matches.length === 1) {
    return {
      ...comment,
      state: matches[0],
      method: `${flair ? 'Author flair' : 'Only state mentioned in text'}`,
    }
  }
  const uniqueStates = dedupWithCounts(matches);
  if(uniqueStates.length === 1) {
    return {
      ...comment,
      state: uniqueStates[0].value,
      method: `${flair ? 'Author flair and only state mentioned in text' : 'Only state mentioned in text (multiple)'}`,
    }
  }
  if(flair) {
    return {
      ...comment,
      state: flair,
      allStates: uniqueStates,
      method: 'Author flair; multiple states mentioned'
    }
  }
  uniqueStates.sort((a, b) => b.count - a.count);
  if(uniqueStates[0].count > uniqueStates[1].count) {
    return {
      ...comment,
      state: uniqueStates[0].value,
      allStates: uniqueStates,
      method: 'Most mentioned state',
    }
  }
  return {
    ...comment,
    state: 'Indeterminate',
    allStates: uniqueStates,
    method: 'Multiple states mentioned equal times; no author flair'
  }
}

const dedupWithCounts = arr => {
  const seen = {};
  const deduped = arr.reduce((res, cur) => {
    if(seen[cur]) {
      seen[cur]++;
      return res;
    }
    seen[cur] = 1;
    return res.concat(cur);
  }, [])
  return deduped.map(it => ({
    value: it,
    count: seen[it],
  }));
}

const fixScore = comment => {
  const ups = parseInt(comment.data.ups);
  if(Number.isNaN(ups)) {
    comment.data.ups = 0;
    return comment;
  }
  comment.data.ups = ups;
  return comment;
}

const makeLink = permalink => `https://www.reddit.com${permalink}`;

const makeDate = redditDate => new Date(redditDate * 1000);

const fixText = text => `"${text.replace(/(\r\n|\n|\r)/gm,' -- ').replace(/"/g, '\'')}"`;

module.exports = analyzeThread;