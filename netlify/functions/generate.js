// ─────────────────────────────────────────────────────────────────
// Netlify Function: generate.js
// ─────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set in Netlify Environment Variables.' })
    };
  }

  let inputs;
  try {
    inputs = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request: ' + e.message })
    };
  }

  const {
    productId, productName, productTagline, productObjective,
    systemPrompt,
    generatorLabel, generatorPrefix,
    proposalType, selectedModuleNames, selectedSurroundNames, singleModuleName,
    state, department, submissionType,
    schools, grades, students, teachers, duration,
    implementingPartner, budget, cm2, context, differentiators,
    org, psuContext, rfpLoaded, rfpText
  } = inputs;

  if (!systemPrompt || !generatorPrefix) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing systemPrompt or generatorPrefix in request.' })
    };
  }

  // ── Module context ──
  let moduleContext = '';
  if (proposalType === 'vsk' && selectedModuleNames && selectedModuleNames.length > 0) {
    moduleContext = '\nSELECTED MODULES (' + selectedModuleNames.length + '):\n' +
      selectedModuleNames.map(function(m, i) { return (i+1) + '. ' + m; }).join('\n');
    if (selectedSurroundNames && selectedSurroundNames.length > 0) {
      moduleContext += '\n\nOPTIONAL SURROUND SUPPORT INCLUDED:\n' +
        selectedSurroundNames.map(function(s) { return '• ' + s; }).join('\n');
    }
  } else if (proposalType === 'vai') {
    if (selectedModuleNames && selectedModuleNames.length > 0) {
      moduleContext = '\nCORE MODULES:\n' + selectedModuleNames.map(function(m,i){ return (i+1)+'. '+m; }).join('\n');
    }
    if (selectedSurroundNames && selectedSurroundNames.length > 0) {
      moduleContext += '\n\nSURROUND SUPPORT INCLUDED:\n' + selectedSurroundNames.map(function(s){ return '• '+s; }).join('\n');
    }
  } else if (proposalType === 'module' && singleModuleName) {
    moduleContext = '\nSINGLE MODULE PROPOSAL: ' + singleModuleName;
  }

  // ── Org context ──
  let orgContext = '';
  if (org && org !== 'direct') {
    const orgNames = { tcil: 'TCIL', railtel: 'RailTel Corporation of India', nic: 'NIC', other: 'a Government PSU' };
    orgContext = '\nSUBMITTING ORGANISATION: ' + (orgNames[org] || org) + ' is the prime bidder. ConveGenius is the technology partner.';
    if (psuContext) orgContext += '\nPSU CONTEXT: ' + psuContext;
  }

  // ── RFP context (cap at 12000 chars to stay within limits) ──
  let rfpContext = '';
  if (rfpLoaded && rfpText && rfpText.length > 50) {
    const rfpCapped = rfpText.substring(0, 12000);
    rfpContext = '\n\n═══ UPLOADED RFP — ADDRESS EVERY REQUIREMENT BELOW ═══\n' +
      rfpCapped +
      (rfpText.length > 12000 ? '\n[RFP continues — key requirements captured above]' : '') +
      '\n═══ END OF RFP ═══';
  }

  // ── User prompt ──
  const userPrompt = [
    generatorPrefix,
    '',
    'PRODUCT: ' + productName + (productTagline ? ' — ' + productTagline : ''),
    productObjective ? 'OBJECTIVE: ' + productObjective : '',
    moduleContext,
    orgContext,
    '',
    'PROJECT DETAILS:',
    '- State: ' + state,
    '- Department: ' + department,
    '- Submission Type: ' + submissionType,
    schools ? '- Schools: ' + Number(schools).toLocaleString('en-IN') : '',
    grades ? '- Grades: ' + grades : '',
    students ? '- Students: ' + Number(students).toLocaleString('en-IN') : '',
    teachers ? '- Teachers: ' + Number(teachers).toLocaleString('en-IN') : '',
    duration ? '- Duration: ' + duration : '',
    implementingPartner ? '- Implementing Partner: ' + implementingPartner : '',
    budget ? '- Budget: ₹' + budget + ' Cr' : '',
    cm2 ? '- Target CM2: ' + cm2 + '%' : '',
    context ? '\nCONTEXT:\n' + context : '',
    differentiators ? '\nKEY DIFFERENTIATORS:\n' + differentiators : '',
    rfpContext
  ].filter(Boolean).join('\n');

  // ── Call Claude ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      let errMsg = 'Anthropic API error ' + response.status;
      try {
        const errJson = await response.json();
        if (response.status === 401) errMsg = 'Invalid API key — check ANTHROPIC_API_KEY in Netlify environment variables.';
        else if (response.status === 429) errMsg = 'Rate limit — wait a moment and try again.';
        else if (errJson.error) errMsg = errJson.error.message;
      } catch(e) {}
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errMsg })
      };
    }

    const data = await response.json();
    const output = data.content && data.content[0] ? data.content[0].text : 'No output received.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output: output })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Function error: ' + (err.message || 'Unknown error') })
    };
  }
};
