import type { StrivingSnapshot } from './types'

const lap = (id: string, name: string, status: 'queued' | 'ready' | 'in_progress' | 'blocked' | 'finished', finishCondition: string) => ({ id, name, status, finishCondition, evidence: [] })

export const demoSnapshot: StrivingSnapshot = {
  generatedAt: '2026-08-22T00:00:00Z',
  doctrine: 'Striving Observation',
  seasons: [
    { id: 'build', name: 'Build Season', theme: 'products and systems', raceIds: ['pesa-smart', 'q-city', 'pocket-agent', 'wnn'] },
    { id: 'proof', name: 'Proof Season', theme: 'completed capability', raceIds: ['simple-data-entry', 'lawrebac', 'twezimbe', 'dhis2-mcp'] },
    { id: 'commercial', name: 'Commercial Season', theme: 'sales and engagement', raceIds: ['agentic-sales', 'external-wait'] },
  ],
  races: [
    {
      id: 'pesa-smart', name: 'Pesa Smart', projectId: 'pesa-smart',
      finishLine: 'A verified playable closing build with defects captured and cleared.', status: 'racing', health: 'green',
      circuit: { id: 'closing', name: 'Closing Circuit', kind: 'closing', mutableSurface: ['defects', 'playability polish'], frozen: ['new modes', 'architecture rewrite'], lapDefinition: 'one state-changing closing pass', closureEvidence: 'verified playthrough evidence', laps: [lap('concept','World and cue-club concept','finished','concept coherent'),lap('core','Core play loop','finished','game playable'),lap('art','3D environment and art refinement','finished','visual language coherent'),lap('banter','Banter and room vibe','finished','social texture working'),lap('playthrough','Full playthrough + defect capture','in_progress','complete a full run and log blockers'),lap('clear-defects','Clear closing defects','queued','all closing blockers resolved')] },
      currentLapId: 'playthrough', dependencies: [], nextLegalLap: 'Full playthrough + defect capture', confidence: 'observed',
      history: [
        { id:'ps-1', label:'Race opened', kind:'start', progress:0, confidence:'inferred' },
        { id:'ps-2', label:'Playable core established', kind:'progress', progress:38, confidence:'inferred' },
        { id:'ps-3', label:'3D/world language refined', kind:'progress', progress:62, confidence:'observed' },
        { id:'ps-4', label:'Closing circuit entered', kind:'mutation', progress:78, confidence:'observed' },
        { id:'ps-5', label:'Playthrough now decides the finish', kind:'progress', progress:84, confidence:'observed' },
      ],
    },
    {
      id: 'q-city', name: 'Q-City', projectId: 'q-city', finishLine: 'A legible, explorable district experience built from mature primitives.', status: 'racing', health: 'green',
      circuit: { id:'architecture', name:'Architecture Rally', kind:'rally', mutableSurface:['map composition','2.5D to 3D layer','onboarding'], frozen:['generic stall-first redesign'], lapDefinition:'one compositional system made legible', closureEvidence:'working scene or interaction', laps:[lap('districts','District model','finished','district ontology established'),lap('broadcast','Broadcast district','finished','curation experience coherent'),lap('feedback','Early user confusion surfaced','finished','feedback captured'),lap('map-cleanup','Map cleanup','ready','map hierarchy is legible'),lap('blend','2.5D → 3D blend','queued','first blended scene works'),lap('onboarding','Onboarding path','queued','first-time navigation is legible')] },
      currentLapId:'map-cleanup', dependencies:[], nextLegalLap:'Map cleanup', confidence:'inferred',
      history:[{id:'qc-1',label:'Q-City world begins',kind:'start',progress:0,confidence:'inferred'},{id:'qc-2',label:'Broadcast district becomes concrete',kind:'progress',progress:28,confidence:'observed'},{id:'qc-3',label:'Generic 3D stall approach rejected',kind:'mutation',progress:39,confidence:'observed'},{id:'qc-4',label:'User confusion exposes navigation problem',kind:'blocker',progress:48,confidence:'observed'},{id:'qc-5',label:'2.5D→3D architecture selected',kind:'progress',progress:58,confidence:'observed'}],
    },
    {
      id:'pocket-agent', name:'Pocket Agent', projectId:'pocket-agent', finishLine:'A working capture-to-personalized-dissemination pilot for mass communication.', status:'racing', health:'green',
      circuit:{id:'pilot',name:'Pilot Endurance',kind:'endurance',mutableSurface:['PWA','capture flow','personalized dissemination'],frozen:['premature hardware production'],lapDefinition:'one pilot capability becomes usable',closureEvidence:'pilot participant can use it',laps:[lap('problem','Problem framing','finished','gap is clear'),lap('pwa','PWA architecture','finished','web flow defined'),lap('custodian','Custodian recording flow','finished','record/share pattern defined'),lap('pilot','12-person pilot','ready','pilot can run'),lap('hardware','Physical object translation','queued','hardware path informed by usage')]},
      currentLapId:'pilot',dependencies:[],nextLegalLap:'12-person pilot',confidence:'observed',
      history:[{id:'pa-1',label:'Lecture capture problem identified',kind:'start',progress:0,confidence:'observed'},{id:'pa-2',label:'NotebookLM-like dissemination gap articulated',kind:'progress',progress:26,confidence:'observed'},{id:'pa-3',label:'PWA-first route chosen',kind:'mutation',progress:45,confidence:'observed'},{id:'pa-4',label:'Pilot cohort assembled',kind:'progress',progress:64,confidence:'observed'}],
    },
    {
      id:'wnn', name:'WNN', projectId:'wnn', finishLine:'A repeatable 20-minute kafunda-format news show production system.', status:'parked', health:'rest',
      circuit:{id:'format',name:'Format Testing',kind:'testing',mutableSurface:['segment rhythm','set','camera language'],frozen:[],lapDefinition:'one show-system assumption resolved',closureEvidence:'usable production rule',laps:[lap('format','PTI-style running order','finished','timing locked'),lap('set','Kafunda set language','finished','set concept coherent'),lap('camera','Rick Glassman-inspired camera behavior','finished','camera rules articulated'),lap('pilot','Pilot episode','queued','episode produced')]},
      currentLapId:'pilot',dependencies:[],nextLegalLap:'Pilot episode',confidence:'observed',
      history:[{id:'wnn-1',label:'20-minute format locked',kind:'progress',progress:25,confidence:'observed'},{id:'wnn-2',label:'Kafunda newsroom contradiction defined',kind:'progress',progress:45,confidence:'observed'},{id:'wnn-3',label:'Camera language refined',kind:'progress',progress:66,confidence:'observed'},{id:'wnn-4',label:'Deliberately parked pending production burst',kind:'rest',progress:66,confidence:'inferred'}],
    },
    {
      id:'simple-data-entry', name:'SimpleDataEntry', projectId:'simple-data-entry', finishLine:'Production-ready offline-first data entry system.', status:'finished', health:'green',
      circuit:{id:'delivery',name:'Delivery Endurance',kind:'endurance',mutableSurface:['offline core','sync','UI','verification'],frozen:[],lapDefinition:'one verified delivery transition',closureEvidence:'production-ready state',laps:[lap('offline','Offline-first core','finished','offline workflow works'),lap('sync','Agent sync','finished','sync works'),lap('ui','UI repair','finished','UI usable'),lap('verify','Production verification','finished','production-ready')]},currentLapId:'verify',dependencies:[],confidence:'inferred',
      history:[{id:'sde-1',label:'Initial data-entry surface',kind:'start',progress:0,confidence:'inferred'},{id:'sde-2',label:'Offline-first core established',kind:'progress',progress:35,confidence:'inferred'},{id:'sde-3',label:'Agent sync repaired',kind:'relay',progress:62,confidence:'observed'},{id:'sde-4',label:'UI repaired and verified',kind:'verification',progress:88,confidence:'observed'},{id:'sde-5',label:'Production-ready',kind:'finish',progress:100,confidence:'observed'}],
    },
    {
      id:'lawrebac', name:'Lawrebac Auto Garage', projectId:'lawrebac', finishLine:'Live, portfolio-ready garage product.', status:'finished', health:'green',
      circuit:{id:'ship',name:'Shipping Sprint',kind:'sprint',mutableSurface:['delivery'],frozen:[],lapDefinition:'one shipping transition',closureEvidence:'live deployment',laps:[lap('build','Build','finished','usable product'),lap('ship','Ship','finished','live and usable')]},currentLapId:'ship',dependencies:[],confidence:'inferred',history:[{id:'law-1',label:'Build underway',kind:'start',progress:0,confidence:'inferred'},{id:'law-2',label:'Usable garage product',kind:'progress',progress:72,confidence:'inferred'},{id:'law-3',label:'Live and portfolio-ready',kind:'finish',progress:100,confidence:'observed'}],
    },
    {
      id:'twezimbe', name:'TwezimbeApp', projectId:'twezimbe', finishLine:'Verified product with QA evidence and a clean demo/package state.', status:'stale', health:'amber',
      circuit:{id:'qa',name:'QA Street Circuit',kind:'street',mutableSurface:['QA','packaging'],frozen:['feature expansion'],lapDefinition:'one verification/closure pass',closureEvidence:'fresh verified build',laps:[lap('tests','Automated tests','finished','58/58 tests pass'),lap('fixtures','Fixture validation','finished','87/87 fixtures pass'),lap('physical','Physical QA','finished','physical QA done'),lap('rerun','Fresh rerun + package','ready','current build reconfirmed and demo packaged')]},currentLapId:'rerun',dependencies:[],nextLegalLap:'Fresh rerun + package',confidence:'inferred',history:[{id:'tw-1',label:'Core implementation',kind:'progress',progress:35,confidence:'inferred'},{id:'tw-2',label:'58/58 tests',kind:'verification',progress:68,confidence:'observed'},{id:'tw-3',label:'87/87 fixtures + physical QA',kind:'verification',progress:88,confidence:'observed'},{id:'tw-4',label:'No fresh closure event: race stopped reporting',kind:'blocker',progress:88,confidence:'inferred'}],
    },
    {
      id:'dhis2-mcp', name:'DHIS2 MCP', projectId:'dhis2-mcp', finishLine:'Published, installable, verified DHIS2 MCP package.', status:'waiting_me', health:'amber',
      circuit:{id:'publish',name:'Publishing Sprint',kind:'sprint',mutableSurface:['publish verification','tag','NPX path'],frozen:['new protocol features'],lapDefinition:'one release transition',closureEvidence:'package install succeeds',laps:[lap('package','TypeScript package','finished','package built'),lap('tests','Tests + lint','finished','142 tests + lint pass'),lap('publish','Publish/tag/NPX verification','ready','install path verified')]},currentLapId:'publish',dependencies:[],nextLegalLap:'Publish/tag/NPX verification',confidence:'inferred',history:[{id:'dm-1',label:'MCP implementation matures',kind:'progress',progress:45,confidence:'inferred'},{id:'dm-2',label:'142 tests and lint clean',kind:'verification',progress:82,confidence:'observed'},{id:'dm-3',label:'Release proof still needs verification',kind:'wait',progress:82,confidence:'inferred'}],
    },
    {
      id:'agentic-sales', name:'Agentic Sales', projectId:'agentic-sales', finishLine:'A repeatable system for finding clients and carrying the right commercial context into each interaction.', status:'racing', health:'green',
      circuit:{id:'operating',name:'Commercial Endurance',kind:'endurance',mutableSurface:['prospecting','signals','proof matching','offer engineering'],frozen:['spray-and-pray automation'],lapDefinition:'one reusable commercial mechanism proven',closureEvidence:'repeatable output or booked opportunity',laps:[lap('intel','Market intelligence layer','finished','ICP language/trigger model'),lap('access','Access pathfinding','finished','lead access mechanisms mapped'),lap('proof','Proof matching','in_progress','projects map to current need'),lap('engagement','Engagement mining','ready','opportunity surface operational')]},currentLapId:'proof',dependencies:[],nextLegalLap:'Proof matching',confidence:'observed',history:[{id:'as-1',label:'Sales problem split into access + context',kind:'start',progress:0,confidence:'observed'},{id:'as-2',label:'Outbound infrastructure doctrine assembled',kind:'progress',progress:31,confidence:'observed'},{id:'as-3',label:'Creator-comment access paths added',kind:'progress',progress:48,confidence:'observed'},{id:'as-4',label:'Portfolio/engagement/sales converge on proof substrate',kind:'mutation',progress:66,confidence:'observed'}],
    },
    {
      id:'external-wait', name:'External Collaboration', projectId:'external-wait', finishLine:'A collaborator-dependent project reaches a clear next state.', status:'waiting_external', health:'amber',
      circuit:{id:'relay',name:'Relay Circuit',kind:'street',mutableSurface:['handoff','follow-up','reroute'],frozen:['inventing work for the other party'],lapDefinition:'one external relay transition',closureEvidence:'response, reroute, or explicit close',laps:[lap('handoff','Handoff sent','finished','baton transferred'),lap('response','External response','blocked','collaborator responds'),lap('reroute','Reroute if silent','queued','new path selected')]},currentLapId:'response',dependencies:[{type:'waiting_on',targetId:'external-party',label:'Waiting on collaborator'}],nextLegalLap:'Wait until follow-up threshold, then reroute',confidence:'inferred',history:[{id:'ew-1',label:'Handoff sent',kind:'relay',progress:52,confidence:'inferred'},{id:'ew-2',label:'Waiting on external',kind:'wait',progress:52,confidence:'inferred'}],
    },
  ],
  recurringTemplates: [
    { id:'weekly-sales', name:'Weekly Sales Sprint', recurrence:'weekly', circuitKind:'sprint', finishLinePattern:'Complete this week’s commercial operating loop.' },
    { id:'evening-return', name:'Evening Return GP', recurrence:'daily', circuitKind:'sprint', finishLinePattern:'Close batons and surface tomorrow’s legal laps.' },
  ],
}
