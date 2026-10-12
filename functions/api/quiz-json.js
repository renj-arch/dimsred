export async function onRequestGet(context) {
  try {
    var reqUrl = new URL(context.request.url);
    var baseUrl = reqUrl.origin;

    var manifestUrl = baseUrl + '/data/questions/manifest.json';
    var manifestResp = await fetch(manifestUrl);
    if (!manifestResp.ok) {
      return new Response(JSON.stringify({ error: 'Question manifest not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    var files = await manifestResp.json();

    var fetches = files.map(async function(f) {
      var resp = await fetch(baseUrl + '/data/questions/' + f);
      return resp.ok ? resp.json() : null;
    });
    var results = await Promise.all(fetches);

    var allQuestions = [];
    for (var di = 0; di < results.length; di++) {
      var data = results[di];
      if (!data) continue;
      var subjectKeys = Object.keys(data);
      for (var si = 0; si < subjectKeys.length; si++) {
        var subjectData = data[subjectKeys[si]];
        if (!subjectData.subSubjects) continue;
        var subKeys = Object.keys(subjectData.subSubjects);
        for (var ss = 0; ss < subKeys.length; ss++) {
          var qs = subjectData.subSubjects[subKeys[ss]];
          for (var qi = 0; qi < qs.length; qi++) {
            allQuestions.push(qs[qi]);
          }
        }
      }
    }

    return new Response(JSON.stringify({ questions: allQuestions }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, must-revalidate'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
