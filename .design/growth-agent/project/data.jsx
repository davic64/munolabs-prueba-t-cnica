/* data.jsx — demo content for Growth Agent (Spanish, generic placeholder clients) */

const CLIENTS = [
  { id: 'acme', name: 'Acme' },
  { id: 'globex', name: 'Globex' },
  { id: 'initech', name: 'Initech' },
  { id: 'umbrella', name: 'Umbrella' },
  { id: 'soylent', name: 'Soylent' },
  { id: 'hooli', name: 'Hooli' },
  { id: 'stark', name: 'Stark Industries' },
  { id: 'vandelay', name: 'Vandelay' },
];

const USER = { name: 'Tomás Iriarte', role: 'Account lead', clients: 8 };

const ACCOUNTS = [
  { id: 'tomas', name: 'Tomás Iriarte', email: 'tomas@studio.co', scope: 'Todas las cuentas', scopeLabel: 'all', clients: 8 },
  { id: 'dana', name: 'Dana Roux', email: 'dana@studio.co', scope: 'Solo Acme', scopeLabel: 'acme', clients: 1 },
];

/* Suggestion cards on the empty state */
const SUGGESTIONS = [
  { id: 'status', icon: 'Activity', cat: 'Estado', label: 'Estado de una cuenta', prompt: '¿Qué quedó con Acme en la reunión de ayer? Tengo el QBR mañana a las 10.' },
  { id: 'risks', icon: 'AlertTriangle', cat: 'Riesgos', label: 'Riesgos abiertos', prompt: '¿Qué cuentas tienen riesgos esta semana?' },
  { id: 'brief', icon: 'FileText', cat: 'Reunión', label: 'Brief de reunión', prompt: 'Armá el brief para mi reunión con Globex de mañana y dejámelo en Notion.' },
  { id: 'slack', icon: 'MessageSquare', cat: 'Resumen', label: 'Resumen de Slack', prompt: 'Resumime lo último del Slack de Initech.' },
];

/* Tool-call cards rendered above an assistant message. state: 'done' | 'running' | 'pending' */
/* Each assistant turn = { tools: [...], md: "markdown string" } */

const RESP_STATUS = {
  tools: [
    { tool: 'granola.get_transcript', client: 'acme', state: 'done', note: 'QBR prep call · ayer · 47 min' },
    { tool: 'linear.search_issues', client: 'acme', state: 'done', note: '12 issues · 3 marcados en riesgo' },
    { tool: 'notion.get_page', client: 'acme', state: 'done', note: 'Plan de cuenta · Q2' },
  ],
  md: `## [Activity] Estado de Acme

La cuenta está **estable pero con un riesgo activo** en la campaña de Q2. El equipo cerró el rediseño del onboarding, pero el deploy de la campaña paga se corrió por una dependencia de tracking.

> [!warning] El deploy de la campaña de paid se movió del 3 al 10 de junio. Bloquea el arranque de la inversión en ads — el QBR de mañana va a preguntar por esto.

### Workstreams

| Workstream | Estado | Owner | Próximo paso |
| --- | --- | --- | --- |
| Onboarding redesign | Completado | Dana | Medir activación a 14 días |
| Campaña paid Q2 | En riesgo | Marco | Desbloquear \`tracking\` |
| Reporting dashboard | En progreso | Lía | Demo el viernes |
| Integración CRM | En espera | — | Pendiente de Acme |

> [!success] La activación del nuevo onboarding subió 18% en la primera semana. Es el mejor dato para abrir el QBR.

> [!danger] El contrato de soporte vence el 30 de junio y la renovación todavía no se envió. Si no se mueve esta semana, queda fuera de ciclo.

**Para mañana:** abrí con el dato de activación, encará el riesgo del deploy con fecha concreta (10/jun) y cerrá pidiendo definición sobre la renovación.

Fuente: Granola — QBR prep call (ayer)
Fuente: Linear — ACM-142, ACM-138
Fuente: Notion — Plan de cuenta Acme · Q2`,
};

const RESP_RISKS = {
  tools: [
    { tool: 'linear.search_issues', client: 'all', state: 'done', note: 'label:riesgo · 8 cuentas' },
    { tool: 'slack.search_messages', client: 'all', state: 'done', note: 'últimos 7 días · 4 canales' },
  ],
  md: `## [ShieldAlert] Riesgos abiertos esta semana

Tres cuentas necesitan atención antes del viernes. El resto está dentro de carril.

| Cuenta | Riesgo | Severidad | Desde |
| --- | --- | --- | --- |
| Acme | Deploy de campaña corrido al 10/jun | Alta | hace 2 días |
| Globex | Bug de checkout en mobile (500) | Alta | hoy |
| Soylent | Sin respuesta del sponsor hace 9 días | Media | hace 9 días |

> [!danger] Globex es el más urgente: el bug de checkout está afectando conversiones en producción ahora mismo. Ya hay un issue abierto sin owner.

> [!info] Las otras 5 cuentas no tienen riesgos abiertos. Umbrella y Hooli cerraron sus pendientes esta semana.

**Sugerencia:** asigná owner al bug de Globex antes de las 12 y dejá el follow-up de Soylent para el lunes.

Fuente: Linear — vista \`label:riesgo\`
Fuente: Slack — #globex-eng, #soylent-cuenta`,
};

const RESP_BRIEF = {
  tools: [
    { tool: 'granola.get_transcript', client: 'globex', state: 'done', note: 'Última sync · hace 6 días' },
    { tool: 'calendar.get_event', client: 'globex', state: 'done', note: 'Mañana 14:00 · Check-in Q2' },
    { tool: 'notion.create_page', client: 'globex', state: 'pending', note: 'Requiere confirmación' },
  ],
  md: `## [FileText] Brief — Check-in con Globex

Mañana 14:00. Es un check-in de seguimiento, no un QBR. El tema caliente es el bug de checkout.

### Agenda sugerida

1. **Estado del bug de checkout** — ya está reproducido, falta owner y ETA.
2. **Roadmap de Q2** — confirmar prioridad entre integración de pagos y rediseño de pricing.
3. **Reporte mensual** — Globex pidió métricas de retención; tenerlas a mano.

> [!warning] No prometas fecha del fix de checkout sin antes hablar con el equipo de eng — todavía no está estimado.

**Lo dejé como pendiente de confirmación.** Revisá el brief y confirmalo en *Pending writes* antes de que lo escriba en Notion.

Fuente: Granola — Globex sync (hace 6 días)
Fuente: Calendar — Check-in Q2 (mañana)`,
};

const RESP_SLACK = {
  tools: [
    { tool: 'slack.search_messages', client: 'initech', state: 'done', note: '#initech-cuenta · 24h' },
  ],
  md: `## [MessageSquare] Slack de Initech — últimas 24h

Movimiento tranquilo. Tres cosas que vale la pena saber:

- El cliente **aprobó el copy** de la landing nueva. Listo para producción.
- Pidieron **adelantar la demo** del jueves al miércoles a las 16:00.
- Marco avisó que el **acceso al analytics** todavía está pendiente del lado de Initech.

> [!info] Nada urgente. El único bloqueo abierto es el acceso a analytics, y depende de ellos.

Fuente: Slack — #initech-cuenta`,
};

const RESP_FALLBACK = {
  tools: [
    { tool: 'linear.search_issues', client: 'all', state: 'done', note: 'búsqueda general' },
    { tool: 'notion.search', client: 'all', state: 'done', note: 'workspace del estudio' },
  ],
  md: `## [Sparkles] Acá tenés

Revisé Linear, Notion y los últimos transcripts de Granola. No tengo contexto específico sobre eso todavía, pero puedo armarte el estado de cualquier cuenta, listar riesgos abiertos o preparar un brief de reunión.

> [!info] Probá pidiéndome algo como *"¿qué quedó con Acme?"* o *"armá el brief para mañana"*.

Fuente: contexto del estudio`,
};

const RESPONSES = {
  status: RESP_STATUS,
  risks: RESP_RISKS,
  brief: RESP_BRIEF,
  slack: RESP_SLACK,
};

function responseFor(text, suggestionId) {
  if (suggestionId && RESPONSES[suggestionId]) return RESPONSES[suggestionId];
  const t = (text || '').toLowerCase();
  if (/acme|qbr|estado|status|reuni|qued/.test(t)) return RESP_STATUS;
  if (/riesg|risk|bloque|urgent/.test(t)) return RESP_RISKS;
  if (/brief|prepar|arm[áa]|reuni|globex/.test(t)) return RESP_BRIEF;
  if (/slack|resum|initech/.test(t)) return RESP_SLACK;
  return RESP_FALLBACK;
}

/* Pending writes */
const INTENTS = [
  {
    id: 'i1', tool: 'notion.create_page', client: 'globex', status: 'pending',
    ts: 'hace 2 min',
    title: 'Brief — Check-in con Globex',
    preview: 'Agenda: estado del bug de checkout · roadmap Q2 · reporte mensual. Destacar que el fix de checkout no tiene ETA todavía.',
  },
  {
    id: 'i2', tool: 'linear.create_issue', client: 'globex', status: 'pending',
    ts: 'hace 8 min',
    title: 'Bug: checkout devuelve 500 en mobile',
    preview: 'Prioridad: Urgent · Equipo: Web · Sin owner asignado. Reproducible en iOS Safari al confirmar el pago.',
  },
  {
    id: 'i3', tool: 'calendar.create_event', client: 'initech', status: 'confirmed',
    ts: 'hace 1 h',
    title: 'Demo Initech — miércoles 16:00',
    preview: 'Movida del jueves al miércoles a pedido del cliente. Invitados: Tomás, Marco, sponsor de Initech.',
  },
  {
    id: 'i4', tool: 'slack.send_message', client: 'umbrella', status: 'rejected',
    ts: 'hace 3 h',
    title: 'Recordatorio de entregable en #umbrella-cuenta',
    preview: '"Recordatorio: el entregable de diseño vence mañana." — Rechazado: el deadline ya se movió.',
  },
  {
    id: 'i5', tool: 'linear.update_issue', client: 'hooli', status: 'failed',
    ts: 'ayer',
    title: 'Mover HOO-88 a Done',
    preview: 'Falló: el issue fue archivado por otro miembro del equipo antes de aplicar el cambio.',
  },
];

Object.assign(window, {
  CLIENTS, USER, ACCOUNTS, SUGGESTIONS, RESPONSES, responseFor, INTENTS,
});