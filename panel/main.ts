import { HostRequestError, connectHost } from '@openchamber/sdk';
import { applyHostReady, mountBadge, mountButton } from '@openchamber/sdk/ui';
import {
  parseTelemetrySnapshot,
  unavailableTelemetry,
  type AvailableTelemetry,
  type TelemetryPhase,
  type TelemetrySnapshot,
} from '../src/telemetry.ts';

const host = connectHost();
const root = document.querySelector('#root');
if (!root) throw new Error('OMLX Scope is missing its root element.');

const style = `
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--oc-bg);color:var(--oc-fg);font-family:var(--oc-font);font-size:13px;line-height:1.45}body{overflow-x:hidden;overflow-wrap:anywhere}button{font:inherit;touch-action:manipulation}.rs button:focus-visible{outline:2px solid var(--oc-accent,var(--oc-success-text));outline-offset:3px}.rs button:hover:not(:disabled){filter:brightness(1.08)}.rs button:active:not(:disabled){transform:translateY(1px)}[hidden]{display:none!important}
 .rs{display:flex;min-height:100vh;max-width:860px;margin:0 auto;flex-direction:column;gap:15px;padding:17px 15px 14px}.rs h1,.rs h2,.rs h3,.rs p{margin:0}.rs h1{font-size:18px;font-weight:680;letter-spacing:-.035em}.rs h2{font-size:11px;font-weight:650;letter-spacing:.075em;text-transform:uppercase}.rs p{color:var(--oc-muted)}
 .rs-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.rs-heading{display:flex;min-width:0;flex-direction:column;gap:4px}.rs-brandline{display:flex;align-items:center;gap:8px}.rs-mark{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,var(--oc-success-text),#7ed9ff);box-shadow:0 0 0 3px color-mix(in srgb,var(--oc-success-text) 12%,transparent),0 0 16px color-mix(in srgb,var(--oc-success-text) 30%,transparent)}.rs-subtitle{font:10px var(--oc-mono);color:var(--oc-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-context{font-size:10px;color:var(--oc-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(55vw,410px)}.rs-actions{display:flex;align-items:center;gap:7px}.rs-service{display:flex;align-items:center;gap:6px;color:var(--oc-muted);font:10px var(--oc-mono);white-space:nowrap}.rs-service-dot{width:6px;height:6px;border-radius:50%;background:var(--oc-muted)}.rs-service-dot.ready{background:var(--oc-success-text);box-shadow:0 0 9px color-mix(in srgb,var(--oc-success-text) 55%,transparent)}.rs-service-dot.failed{background:var(--oc-error-text)}
 .rs-stack{display:flex;flex-direction:column;gap:13px}.rs-hero{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--oc-success-text) 24%,var(--oc-border));border-radius:17px;background:radial-gradient(circle at 88% 10%,color-mix(in srgb,var(--oc-success-text) 13%,transparent),transparent 34%),linear-gradient(135deg,color-mix(in srgb,var(--oc-muted-surface) 92%,var(--oc-success-text)),var(--oc-muted-surface));box-shadow:0 14px 32px color-mix(in srgb,var(--oc-bg) 35%,transparent),inset 0 1px color-mix(in srgb,var(--oc-fg) 8%,transparent);padding:17px}.rs-hero::after{position:absolute;right:-46px;bottom:-76px;width:210px;height:170px;border:1px solid color-mix(in srgb,var(--oc-success-text) 16%,transparent);border-radius:50%;box-shadow:0 0 0 20px color-mix(in srgb,var(--oc-success-text) 3%,transparent),0 0 0 40px color-mix(in srgb,var(--oc-success-text) 2%,transparent);content:"";pointer-events:none}.rs-hero-top,.rs-panel-heading,.rs-session-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.rs-overline{color:var(--oc-muted);font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.rs-phase{display:inline-flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,var(--oc-success-text) 25%,var(--oc-border));border-radius:999px;padding:4px 8px;color:var(--oc-fg);font:10px var(--oc-mono);background:color-mix(in srgb,var(--oc-bg) 26%,transparent)}.rs-phase-dot{width:6px;height:6px;border-radius:50%;background:var(--oc-success-text);box-shadow:0 0 10px color-mix(in srgb,var(--oc-success-text) 70%,transparent)}.rs-phase-dot.warn{background:var(--oc-warning-text);box-shadow:none}.rs-phase-dot.error{background:var(--oc-error-text);box-shadow:none}.rs-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,.84fr);align-items:center;gap:16px;margin-top:18px}.rs-reading{min-width:0}.rs-reading-value{font-size:clamp(40px,8vw,66px);font-weight:520;letter-spacing:-.075em;line-height:.94;font-variant-numeric:tabular-nums;color:var(--oc-fg)}.rs-reading-value.text{font-size:38px;letter-spacing:-.055em}.rs-reading-unit{margin-top:8px;color:var(--oc-muted);font-size:11px}.rs-reading-detail{max-width:350px;margin-top:9px;color:var(--oc-muted);font-size:11px}.rs-hero-meta{display:flex;flex-wrap:wrap;gap:8px 17px;margin-top:19px;padding-top:12px;border-top:1px solid color-mix(in srgb,var(--oc-fg) 9%,transparent)}.rs-meta-item{display:flex;min-width:0;flex-direction:column;gap:2px}.rs-meta-label{color:var(--oc-muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em}.rs-meta-value{max-width:190px;overflow:hidden;color:var(--oc-fg);font:10px var(--oc-mono);text-overflow:ellipsis;white-space:nowrap}.rs-spark{position:relative;min-height:122px;border:1px solid color-mix(in srgb,var(--oc-fg) 9%,transparent);border-radius:12px;background:color-mix(in srgb,var(--oc-bg) 22%,transparent);padding:9px}.rs-spark svg{display:block;width:100%;height:86px}.rs-spark-grid{stroke:color-mix(in srgb,var(--oc-fg) 10%,transparent);stroke-width:1}.rs-spark-area{fill:url(#rs-spark-fill)}.rs-spark-line{fill:none;stroke:var(--oc-success-text);stroke-linecap:round;stroke-linejoin:round;stroke-width:2}.rs-spark-dot{fill:var(--oc-fg);stroke:var(--oc-success-text);stroke-width:2}.rs-spark-empty{display:grid;height:86px;place-items:center;color:var(--oc-muted);font:9px var(--oc-mono);letter-spacing:.08em;text-align:center;text-transform:uppercase}.rs-spark-caption{display:flex;justify-content:space-between;margin-top:5px;color:var(--oc-muted);font:9px var(--oc-mono)}
 .rs-kpi-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.rs-kpi,.rs-panel,.rs-session{border:1px solid var(--oc-border);border-radius:13px;background:color-mix(in srgb,var(--oc-muted-surface) 92%,transparent);box-shadow:inset 0 1px color-mix(in srgb,var(--oc-fg) 5%,transparent)}.rs-kpi{padding:12px}.rs-kpi-label{display:block;color:var(--oc-muted);font-size:9px;font-weight:650;letter-spacing:.1em;text-transform:uppercase}.rs-kpi-value{display:block;margin-top:7px;color:var(--oc-fg);font:520 20px var(--oc-mono);font-variant-numeric:tabular-nums}.rs-kpi-sub{display:block;margin-top:3px;overflow:hidden;color:var(--oc-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.rs-panel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.rs-panel{padding:14px}.rs-panel-heading{padding-bottom:10px;border-bottom:1px solid var(--oc-border);color:var(--oc-fg)}.rs-panel-heading .rs-overline{color:var(--oc-fg)}.rs-field-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 15px;padding-top:13px}.rs-field{min-width:0}.rs-field-label{display:block;color:var(--oc-muted);font-size:10px}.rs-field-value{display:block;margin-top:3px;overflow:hidden;color:var(--oc-fg);font:500 11px var(--oc-mono);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap}.rs-field-value.live{color:var(--oc-success-text)}.rs-field-value.warn{color:var(--oc-warning-text)}.rs-session{padding:13px 14px}.rs-session-head{margin-bottom:11px}.rs-session-note{color:var(--oc-muted);font-size:10px}.rs-session-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.rs-session-grid .rs-field{padding-left:10px;border-left:1px solid var(--oc-border)}.rs-session-grid .rs-field:first-child{padding-left:0;border-left:0}.rs-note{border:1px solid var(--oc-border);border-radius:11px;padding:12px;color:var(--oc-muted);font-size:11px;background:color-mix(in srgb,var(--oc-muted-surface) 70%,transparent)}.rs-note strong{display:block;margin-bottom:4px;color:var(--oc-fg);font-weight:650}.rs-footer{margin-top:auto;padding-top:5px;color:var(--oc-muted);font-size:9px;letter-spacing:.02em}.rs-error{color:var(--oc-error-text)}
 @media(max-width:560px){.rs{padding:14px 12px 12px}.rs-header{gap:8px}.rs-service{display:none}.rs-context{max-width:68vw}.rs-hero-grid{grid-template-columns:1fr}.rs-spark{min-height:104px}.rs-spark svg{height:70px}.rs-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}.rs-panel-grid{grid-template-columns:1fr}.rs-session-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rs-session-grid .rs-field:nth-child(3){padding-left:0;border-left:0}}
 @media(prefers-reduced-motion:reduce){.rs *{animation:none!important;transition:none!important}}
 /* Premium direction: restrained native utility chrome, one signal accent, no decorative noise. */
 .rs{max-width:780px;gap:12px;padding:15px 14px 12px;font-family:var(--oc-font),-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.rs-hero{border-color:var(--oc-border);border-radius:12px;background:var(--oc-muted-surface);box-shadow:none;padding:15px}.rs-hero::after{display:none}.rs-hero-grid{gap:14px;margin-top:14px}.rs-reading-value{font-size:clamp(42px,7vw,58px);font-weight:560;letter-spacing:-.065em}.rs-reading-unit{margin-top:6px}.rs-reading-detail{margin-top:7px}.rs-hero-meta{margin-top:14px;padding-top:10px}.rs-spark{min-height:108px;border-color:var(--oc-border);border-radius:9px;background:var(--oc-bg);padding:8px}.rs-spark svg{height:72px}.rs-kpi-row{overflow:hidden;border:1px solid var(--oc-border);border-radius:10px;gap:0;background:var(--oc-muted-surface)}.rs-kpi{border-right:1px solid var(--oc-border);border-radius:0;background:transparent;box-shadow:none;padding:10px 12px}.rs-kpi:last-child{border-right:0}.rs-kpi-value{margin-top:5px;font-size:18px}.rs-panel-grid{gap:10px}.rs-panel,.rs-session{border-radius:10px;background:var(--oc-muted-surface);box-shadow:none}.rs-panel{padding:12px}.rs-session{padding:11px 12px}.rs-field-list{gap:9px 13px;padding-top:11px}.rs-session-head{margin-bottom:9px}.rs-overline{letter-spacing:.12em}.rs-note{background:var(--oc-muted-surface);box-shadow:none}
 .rs-hero{border-width:1px 0;border-left:2px solid var(--oc-success-text);border-radius:0;background:transparent;padding:14px 15px}.rs-hero-top{padding-bottom:2px}.rs-kpi-row{border-width:1px 0;border-radius:0;background:transparent}.rs-kpi{padding:10px 14px}.rs-panel-grid{border-top:1px solid var(--oc-border);border-bottom:1px solid var(--oc-border);gap:0}.rs-panel{border:0;border-radius:0;background:transparent;padding:13px 14px}.rs-panel + .rs-panel{border-left:1px solid var(--oc-border)}.rs-panel-heading span{display:none}.rs-session{border:0;border-bottom:1px solid var(--oc-border);border-radius:0;background:transparent;padding:12px 0}.rs-session-grid .rs-field{padding-left:14px}.rs-session-grid .rs-field:first-child{padding-left:0}
  @media(max-width:560px){.rs-panel + .rs-panel{border-top:1px solid var(--oc-border);border-left:0}.rs-panel-grid{border-bottom:0}.rs-session-grid .rs-field{padding-left:10px}}
  /* Precision-console pass: one framed instrument, quieter surfaces, stronger rhythm. */
  .rs{--rs-accent:var(--oc-success-text);--rs-hairline:color-mix(in srgb,var(--oc-border) 82%,transparent);max-width:820px;gap:11px;padding:16px 16px 13px;background:linear-gradient(180deg,color-mix(in srgb,var(--oc-muted-surface) 22%,transparent),transparent 250px)}
  .rs-header{align-items:center;padding-bottom:12px;border-bottom:1px solid var(--rs-hairline)}.rs-heading{gap:3px}.rs-brandline{gap:9px}.rs h1{font-size:17px;font-weight:650;letter-spacing:-.045em}.rs-mark{width:8px;height:8px;background:var(--rs-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--rs-accent) 11%,transparent),0 0 16px color-mix(in srgb,var(--rs-accent) 24%,transparent)}.rs-subtitle{font-size:9px;letter-spacing:.035em;opacity:.86}.rs-context{margin-top:1px;max-width:min(62vw,500px);font-size:9px}.rs-header > .rs-actions .oc-sdk-btn{height:27px;padding:0 9px;border:1px solid var(--rs-hairline);border-radius:6px;color:var(--oc-muted);font-size:10px;letter-spacing:.055em;text-transform:uppercase;transition:background-color 150ms ease,color 150ms ease,border-color 150ms ease,transform 100ms ease}.rs-header > .rs-actions .oc-sdk-btn:hover{border-color:color-mix(in srgb,var(--rs-accent) 45%,var(--oc-border));color:var(--oc-fg)}
  .rs-stack{gap:10px}.rs-hero{isolation:isolate;border:1px solid var(--rs-hairline);border-left:2px solid var(--rs-accent);border-radius:10px;background:linear-gradient(120deg,color-mix(in srgb,var(--oc-muted-surface) 78%,var(--oc-bg)),color-mix(in srgb,var(--oc-bg) 92%,var(--oc-muted-surface)));box-shadow:0 10px 26px color-mix(in srgb,var(--oc-bg) 46%,transparent),inset 0 1px color-mix(in srgb,var(--oc-fg) 6%,transparent);padding:0}.rs-hero-top{padding:12px 14px 0}.rs-hero-grid{gap:20px;margin-top:0;padding:12px 14px 14px}.rs-reading-value{font-size:clamp(45px,7.2vw,62px);font-weight:590;letter-spacing:-.075em;text-shadow:0 1px 0 color-mix(in srgb,var(--oc-bg) 40%,transparent)}.rs-reading-unit{margin-top:7px;font-size:10px;letter-spacing:.02em}.rs-reading-detail{margin-top:7px;font-size:11px}.rs-hero-meta{margin-top:15px;padding-top:11px;border-top:1px solid var(--rs-hairline)}.rs-meta-label{font-size:9px;letter-spacing:.1em;text-transform:uppercase}.rs-meta-value{font-size:10px;letter-spacing:-.01em}.rs-phase{border-color:color-mix(in srgb,var(--rs-accent) 40%,var(--oc-border));background:color-mix(in srgb,var(--rs-accent) 7%,var(--oc-bg));font-size:9px;letter-spacing:.02em}.rs-phase-dot{width:5px;height:5px;box-shadow:0 0 9px color-mix(in srgb,var(--rs-accent) 65%,transparent)}
  .rs-spark{min-height:126px;border:1px solid var(--rs-hairline);border-radius:8px;background:linear-gradient(180deg,color-mix(in srgb,var(--oc-muted-surface) 48%,var(--oc-bg)),var(--oc-bg));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--oc-fg) 3%,transparent);padding:10px 10px 8px}.rs-spark svg{height:78px;overflow:visible}.rs-spark-grid{stroke:color-mix(in srgb,var(--oc-border) 78%,transparent);stroke-dasharray:1 5;stroke-linecap:round}.rs-spark-line{stroke:var(--rs-accent);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;vector-effect:non-scaling-stroke}.rs-spark-area{fill:url(#rs-spark-fill);opacity:.62}.rs-spark-dot{fill:var(--oc-bg);stroke:var(--rs-accent);stroke-width:2;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--rs-accent) 62%,transparent))}.rs-spark-caption{margin-top:8px;font-size:9px;letter-spacing:.02em}.rs-spark-empty{font-size:10px}
  .rs-kpi-row{border:1px solid var(--rs-hairline);border-radius:9px;background:color-mix(in srgb,var(--oc-muted-surface) 54%,var(--oc-bg));box-shadow:inset 0 1px color-mix(in srgb,var(--oc-fg) 4%,transparent)}.rs-kpi{min-height:70px;padding:11px 14px}.rs-kpi + .rs-kpi{border-left-color:var(--rs-hairline)}.rs-kpi-label{font-size:9px;letter-spacing:.14em}.rs-kpi-value{margin-top:6px;font-size:19px;letter-spacing:-.035em}.rs-kpi-sub{margin-top:4px;font-size:9px}
  .rs-panel-grid{border:1px solid var(--rs-hairline);border-radius:9px;overflow:hidden;background:color-mix(in srgb,var(--oc-muted-surface) 28%,var(--oc-bg));box-shadow:inset 0 1px color-mix(in srgb,var(--oc-fg) 3%,transparent)}.rs-panel{padding:14px 15px}.rs-panel + .rs-panel{border-left:1px solid var(--rs-hairline)}.rs-panel-heading{padding-bottom:11px;border-bottom-color:var(--rs-hairline)}.rs-panel-heading .rs-overline{font-size:10px;letter-spacing:.13em}.rs-field-list{gap:12px 20px;padding-top:13px}.rs-field-label{font-size:9px;letter-spacing:.015em}.rs-field-value{margin-top:4px;font-size:11px;font-weight:560;letter-spacing:-.015em}.rs-session{padding:13px 0 12px;border-bottom:1px solid var(--rs-hairline)}.rs-session-head{margin:0 0 10px;padding:0 1px}.rs-session-grid{gap:0}.rs-session-grid .rs-field{min-height:35px;padding:2px 14px;border-left-color:var(--rs-hairline)}.rs-session-grid .rs-field:first-child{padding-left:0}.rs-session-note{font-size:9px}.rs-note{border-color:var(--rs-hairline);border-radius:8px;background:color-mix(in srgb,var(--oc-muted-surface) 50%,var(--oc-bg));font-size:10px}.rs-footer{padding-top:9px;border-top:1px solid color-mix(in srgb,var(--oc-border) 58%,transparent);font-size:9px;letter-spacing:.01em;opacity:.8}
  @media(max-width:560px){.rs{padding:14px 12px 11px}.rs-header{align-items:flex-start}.rs-context{max-width:64vw}.rs-hero-grid{gap:14px;padding:11px 13px 13px}.rs-hero-top{padding:11px 13px 0}.rs-spark{min-height:112px}.rs-spark svg{height:68px}.rs-panel-grid{border-radius:8px}.rs-panel{padding:13px}.rs-panel + .rs-panel{border-top:1px solid var(--rs-hairline);border-left:0}.rs-session-grid .rs-field{padding-left:10px}.rs-session-grid .rs-field:first-child{padding-left:0}.rs-kpi{padding-left:11px;padding-right:11px}}
  @media(max-width:420px){.rs-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}.rs-kpi:nth-child(3){border-top:1px solid var(--rs-hairline);border-left:0;grid-column:1 / -1}.rs-kpi{min-height:64px}}
  /* Enclosure: give the utility a deliberate surface instead of a loose stack. */
  .rs{isolation:isolate;min-height:calc(100vh - 24px);margin:12px auto;border:1px solid color-mix(in srgb,var(--oc-border) 58%,transparent);border-radius:13px;background:radial-gradient(ellipse at 100% 0,color-mix(in srgb,var(--oc-primary) 7%,transparent),transparent 38%),linear-gradient(180deg,color-mix(in srgb,var(--oc-muted-surface) 20%,transparent),transparent 42%),var(--oc-bg);box-shadow:0 20px 48px color-mix(in srgb,var(--oc-bg) 45%,transparent),inset 0 1px color-mix(in srgb,var(--oc-fg) 5%,transparent)}
  .rs-hero{border-radius:10px}.rs-hero::after{display:block;position:absolute;inset:0 0 0 51%;width:auto;height:auto;border:0;border-left:1px solid color-mix(in srgb,var(--oc-border) 55%,transparent);border-radius:0;box-shadow:none;background:linear-gradient(180deg,color-mix(in srgb,var(--oc-primary) 5%,transparent),transparent 75%);content:"";pointer-events:none;z-index:0}.rs-hero-top,.rs-hero-grid{position:relative;z-index:1}.rs-hero-top{padding-bottom:11px;border-bottom:1px solid color-mix(in srgb,var(--oc-border) 52%,transparent)}.rs-hero-grid{grid-template-columns:minmax(0,.92fr) minmax(230px,1.08fr);padding-top:14px}.rs-spark{border-color:color-mix(in srgb,var(--oc-border) 72%,transparent);background:color-mix(in srgb,var(--oc-bg) 68%,transparent)}.rs-spark-line{stroke-width:2.25}.rs-kpi-row{background:color-mix(in srgb,var(--oc-muted-surface) 42%,var(--oc-bg));box-shadow:inset 0 2px color-mix(in srgb,var(--oc-primary) 11%,transparent),inset 0 1px color-mix(in srgb,var(--oc-fg) 3%,transparent)}.rs-panel-grid{background:color-mix(in srgb,var(--oc-muted-surface) 22%,var(--oc-bg))}.rs-panel:first-child{background:linear-gradient(180deg,color-mix(in srgb,var(--oc-primary) 3%,transparent),transparent 72%)}.rs-session{background:linear-gradient(90deg,color-mix(in srgb,var(--oc-muted-surface) 20%,transparent),transparent 72%)}
  @media(max-width:560px){.rs{min-height:calc(100vh - 20px);margin:10px auto;border-radius:11px}.rs-hero::after{display:none}.rs-hero-grid{grid-template-columns:1fr}}
 `;

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
};

const svgElement = <K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] => (
  document.createElementNS('http://www.w3.org/2000/svg', tag)
);

const appendField = (parent: HTMLElement, label: string, value: string, tone: '' | 'live' | 'warn' = ''): void => {
  const item = element('div', 'rs-field');
  item.append(element('span', 'rs-field-label', label), element('strong', `rs-field-value ${tone}`, value));
  parent.append(item);
};

const appendKPI = (parent: HTMLElement, label: string, value: string, detail: string): void => {
  const item = element('div', 'rs-kpi');
  item.append(
    element('span', 'rs-kpi-label', label),
    element('strong', 'rs-kpi-value', value),
    element('span', 'rs-kpi-sub', detail),
  );
  parent.append(item);
};

const formatNumber = (value: number | null): string => {
  if (value === null) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
};

const formatTokens = (value: number | null): string => {
  if (value === null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return formatNumber(value);
};

const formatGB = (value: number | null): string => value === null ? '—' : `${value.toFixed(value >= 10 ? 1 : 2)} GB`;
const formatTPS = (value: number | null): string => value === null ? '—' : `${value.toFixed(1)} tok/s`;
const formatPercent = (value: number | null): string => value === null ? '—' : `${value.toFixed(1)}%`;
const formatSeconds = (value: number | null): string => {
  if (value === null) return '—';
  if (value < 60) return `${value.toFixed(1)} s`;
  return `${(value / 60).toFixed(1)} min`;
};
const formatUptime = (value: number | null): string => {
  if (value === null) return '—';
  const seconds = Math.max(0, Math.trunc(value));
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};
const formatAge = (sampledAt: number): string => {
  const seconds = Math.max(0, (Date.now() - sampledAt) / 1_000);
  return seconds < 60 ? `${Math.round(seconds)}s ago` : `${Math.round(seconds / 60)}m ago`;
};

const phaseLabel: Record<TelemetryPhase, string> = {
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  notLoaded: 'Model not loaded',
  idle: 'Idle',
  queued: 'Queued',
  prefill: 'Prefill',
  decode: 'Decode',
  processing: 'Processing',
  unknown: 'Unknown',
};

const nextDelay = (snapshot: AvailableTelemetry | null, failures: number): number => {
  if (failures > 0) return Math.min(8_000, 1_000 * (2 ** Math.min(3, failures - 1)));
  if (snapshot === null) return 750;
  switch (snapshot.phase) {
    case 'decode': return snapshot.activeRequests > 0 ? 250 : 500;
    case 'prefill':
    case 'queued':
    case 'processing': return 500;
    case 'reconnecting':
    case 'connecting': return 750;
    case 'offline': return 1_000;
    default: return 1_500;
  }
};

type SignalPoint = {
  sampledAt: number;
  rate: number;
  phase: 'decode' | 'prefill';
};

type PanelState = {
  snapshot: TelemetrySnapshot | null;
  lastAvailable: AvailableTelemetry | null;
  signalHistory: SignalPoint[];
  failures: number;
  pending: boolean;
  timer: number | null;
  refreshQueued: boolean;
  serviceStatus: string;
  directory: string | null;
  sessionTitle: string | null;
};

const state: PanelState = {
  snapshot: null,
  lastAvailable: null,
  signalHistory: [],
  failures: 0,
  pending: false,
  timer: null,
  refreshQueued: false,
  serviceStatus: 'stopped',
  directory: null,
  sessionTitle: null,
};

const styleNode = element('style', '', style);
document.head.append(styleNode);

const page = element('main', 'rs');
const header = element('header', 'rs-header');
const heading = element('div', 'rs-heading');
const titleRow = element('div', 'rs-actions');
const title = element('h1', '', 'OMLX Scope');
title.id = 'omlx-scope-title';
const brandline = element('div', 'rs-brandline');
const mark = element('span', 'rs-mark');
mark.setAttribute('aria-hidden', 'true');
brandline.append(mark, title);
const serviceSlot = element('div', 'rs-service');
serviceSlot.setAttribute('role', 'status');
serviceSlot.setAttribute('aria-live', 'polite');
const serviceBadge = mountBadge(serviceSlot, { label: 'Service stopped', tone: 'neutral' });
titleRow.append(brandline, serviceSlot);
const subtitle = element('p', 'rs-subtitle', 'oMLX · waiting for a sample');
subtitle.setAttribute('translate', 'no');
const context = element('p', 'rs-context', 'No project selected');
heading.append(titleRow, subtitle, context);
const actions = element('div', 'rs-actions');
const refreshButton = mountButton(actions, {
  label: 'Refresh',
  variant: 'ghost',
  size: 'sm',
  onClick: () => {
    if (state.pending) {
      state.refreshQueued = true;
      return;
    }
    if (state.timer !== null) window.clearTimeout(state.timer);
    state.timer = null;
    void sample();
  },
});
header.append(heading, actions);

const noticeSlot = element('div');
noticeSlot.hidden = true;
noticeSlot.setAttribute('role', 'status');
noticeSlot.setAttribute('aria-live', 'polite');
noticeSlot.setAttribute('aria-atomic', 'true');
const notice = mountBadge(noticeSlot, { label: '', tone: 'neutral' });
const body = element('div', 'rs-stack');
const footer = element('footer', 'rs-footer', 'Independent third-party extension · read-only local oMLX scope');
page.append(header, noticeSlot, body, footer);
page.setAttribute('aria-labelledby', title.id);
root.append(page);

const updateServiceStatus = async (): Promise<void> => {
  try {
    const status = await host.serviceStatus();
    state.serviceStatus = status.status;
  } catch {
    state.serviceStatus = 'unavailable';
  }
  const tone = state.serviceStatus === 'ready' ? 'success' : state.serviceStatus === 'failed' ? 'error' : 'neutral';
  serviceBadge.update({ label: `Service ${state.serviceStatus}`, tone });
};

const setNotice = (message: string | null, tone: 'neutral' | 'success' | 'warning' | 'error' = 'neutral'): void => {
  noticeSlot.hidden = message === null;
  if (message !== null) notice.update({ label: message, tone });
};

const ratioPercent = (numerator: number | null, denominator: number | null): string => {
  if (numerator === null || denominator === null || denominator <= 0) return '—';
  return `${Math.round(Math.min(1, Math.max(0, numerator / denominator)) * 100)}%`;
};

const liveRate = (snapshot: AvailableTelemetry | null): number | null => {
  if (snapshot === null) return null;
  if (snapshot.phase === 'decode') return snapshot.liveDecodeTPS;
  if (snapshot.phase === 'prefill') return snapshot.livePrefillTPS;
  return null;
};

const recordSignal = (snapshot: AvailableTelemetry): void => {
  const rate = liveRate(snapshot);
  if (rate === null || !Number.isFinite(rate)) return;
  if (snapshot.phase !== 'decode' && snapshot.phase !== 'prefill') return;
  const previous = state.signalHistory.at(-1);
  if (previous?.sampledAt === snapshot.sampledAt && previous.rate === rate && previous.phase === snapshot.phase) return;
  const cutoff = snapshot.sampledAt - 90_000;
  state.signalHistory = [
    ...state.signalHistory.filter((point) => point.sampledAt >= cutoff),
    { sampledAt: snapshot.sampledAt, rate, phase: snapshot.phase },
  ].slice(-120);
};

const phaseTone = (phase: TelemetryPhase): 'live' | 'warn' | '' => {
  if (phase === 'decode' || phase === 'prefill') return 'live';
  if (phase === 'queued' || phase === 'reconnecting' || phase === 'connecting') return 'warn';
  return '';
};

const renderPhase = (phase: TelemetryPhase): HTMLElement => {
  const pill = element('div', 'rs-phase');
  const dot = element('span', `rs-phase-dot ${phase === 'offline' || phase === 'unknown' ? 'error' : phaseTone(phase) === 'warn' ? 'warn' : ''}`);
  dot.setAttribute('aria-hidden', 'true');
  pill.append(dot, element('span', '', phaseLabel[phase]));
  return pill;
};

const renderSignal = (phase: TelemetryPhase): HTMLElement => {
  const chart = element('div', 'rs-spark');
  const points = state.signalHistory.filter((point) => point.phase === phase);
  const latest = points.at(-1);
  const peak = points.reduce((maximum, point) => Math.max(maximum, point.rate), 0);
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', points.length > 0
    ? `${phaseLabel[phase]} signal, latest ${formatTPS(latest?.rate ?? null)}, peak ${formatTPS(peak || null)}, ${points.length} actual samples`
    : `No live ${phaseLabel[phase].toLowerCase()} samples yet`);

  if (points.length >= 1) {
    const width = 320;
    const height = 86;
    const minimum = Math.min(...points.map((point) => point.rate));
    const maximum = Math.max(...points.map((point) => point.rate));
    const padding = Math.max(1, (maximum - minimum) * 0.18, maximum * 0.06);
    const lower = Math.max(0, minimum - padding);
    const upper = Math.max(lower + 1, maximum + padding);
    const xFor = (point: SignalPoint): number => (
      ((point.sampledAt - points[0].sampledAt) / Math.max(1, points.at(-1)!.sampledAt - points[0].sampledAt)) * width
    );
    const yFor = (point: SignalPoint): number => height - ((point.rate - lower) / (upper - lower)) * (height - 8) - 4;
    const segments: SignalPoint[][] = [];
    for (const point of points) {
      const lastSegment = segments.at(-1);
      if (lastSegment === undefined || point.sampledAt - lastSegment.at(-1)!.sampledAt > 4_000) segments.push([point]);
      else lastSegment.push(point);
    }
    const svg = svgElement('svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient');
    gradient.id = 'rs-spark-fill';
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('y2', '1');
    const stopTop = svgElement('stop');
    stopTop.setAttribute('offset', '0%');
    stopTop.setAttribute('stop-color', 'var(--oc-success-text)');
    stopTop.setAttribute('stop-opacity', '.25');
    const stopBottom = svgElement('stop');
    stopBottom.setAttribute('offset', '100%');
    stopBottom.setAttribute('stop-color', 'var(--oc-success-text)');
    stopBottom.setAttribute('stop-opacity', '0');
    gradient.append(stopTop, stopBottom);
    defs.append(gradient);
    svg.append(defs);
    for (const fraction of [0.2, 0.5, 0.8]) {
      const line = svgElement('line');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', String(width));
      line.setAttribute('y1', String(height * fraction));
      line.setAttribute('y2', String(height * fraction));
      line.setAttribute('class', 'rs-spark-grid');
      svg.append(line);
    }
    for (const segment of segments) {
      const linePoints = segment.map((point) => `${xFor(point).toFixed(2)},${yFor(point).toFixed(2)}`);
      const linePath = svgElement('path');
      linePath.setAttribute('d', `M ${linePoints.join(' L ')}`);
      linePath.setAttribute('class', 'rs-spark-line');
      svg.append(linePath);
      if (segment.length > 1) {
        const areaPath = svgElement('path');
        const first = segment[0];
        const last = segment.at(-1)!;
        areaPath.setAttribute('d', `M ${linePoints.join(' L ')} L ${xFor(last).toFixed(2)},${height} L ${xFor(first).toFixed(2)},${height} Z`);
        areaPath.setAttribute('class', 'rs-spark-area');
        svg.insertBefore(areaPath, linePath);
      }
    }
    if (latest) {
      const dot = svgElement('circle');
      dot.setAttribute('cx', xFor(latest).toFixed(2));
      dot.setAttribute('cy', yFor(latest).toFixed(2));
      dot.setAttribute('r', '3.5');
      dot.setAttribute('class', 'rs-spark-dot');
      svg.append(dot);
    }
    chart.append(svg);
  } else {
    chart.append(element('div', 'rs-spark-empty', points.length === 1 ? 'One live sample' : 'Awaiting live signal'));
  }

  const caption = element('div', 'rs-spark-caption');
  caption.append(
    element('span', '', points.length > 0 ? `${points.length} samples · 90 sec` : 'No observations'),
    element('span', '', peak > 0 ? `peak ${formatTPS(peak)}` : 'live only'),
  );
  chart.append(caption);
  return chart;
};

const renderPanel = (titleText: string, fields: Array<[string, string, '' | 'live' | 'warn']>): HTMLElement => {
  const panel = element('section', 'rs-panel');
  const heading = element('div', 'rs-panel-heading');
  heading.append(element('h2', 'rs-overline', titleText), element('span', 'rs-overline', 'DETAIL'));
  const list = element('div', 'rs-field-list');
  for (const [label, value, tone] of fields) appendField(list, label, value, tone);
  panel.append(heading, list);
  return panel;
};

const renderSession = (display: AvailableTelemetry): HTMLElement => {
  const session = element('section', 'rs-session');
  const heading = element('div', 'rs-session-head');
  heading.append(element('h2', 'rs-overline', 'Session profile'), element('span', 'rs-session-note', 'since server start / reset'));
  const grid = element('div', 'rs-session-grid');
  appendField(grid, 'Prefill average', formatTPS(display.sessionAveragePrefillTPS));
  appendField(grid, 'Decode average', formatTPS(display.sessionAverageDecodeTPS));
  appendField(grid, 'Cache efficiency', formatPercent(display.sessionCacheEfficiencyPercent));
  appendField(grid, 'Uptime', formatUptime(display.lifetime?.uptimeSeconds ?? null));
  session.append(heading, grid);
  return session;
};

const renderDashboard = (display: AvailableTelemetry, liveStatus: AvailableTelemetry | null): HTMLElement[] => {
  const stale = liveStatus === null;
  const statusPhase = liveStatus?.phase ?? (stale ? 'reconnecting' : display.phase);
  const chartPhase = display.phase === 'prefill' || display.phase === 'decode' ? display.phase : state.signalHistory.at(-1)?.phase ?? 'decode';
  const rate = liveRate(liveStatus);
  const hero = element('section', 'rs-hero');
  const heroTop = element('div', 'rs-hero-top');
  heroTop.append(element('span', 'rs-overline', stale ? 'Last known signal' : 'Live inference'), renderPhase(statusPhase));
  const heroGrid = element('div', 'rs-hero-grid');
  const reading = element('div', 'rs-reading');
  const readingValue = rate === null
    ? statusPhase === 'idle' ? 'Ready' : statusPhase === 'notLoaded' ? 'No model' : '—'
    : rate.toFixed(1);
  const value = element('div', `rs-reading-value ${rate === null ? 'text' : ''}`, readingValue);
  value.setAttribute('aria-label', rate === null ? readingValue : `${readingValue} tokens per second`);
  reading.append(
    value,
    element('div', 'rs-reading-unit', rate === null ? 'runtime phase' : statusPhase === 'prefill' ? 'prompt tokens / second' : 'emitted tokens / second'),
    element('p', 'rs-reading-detail', stale
      ? `Waiting for fresh telemetry · last sample ${formatAge(display.sampledAt)}`
      : display.message ?? (statusPhase === 'idle' ? 'Model loaded and standing by.' : `${formatNumber(display.activeRequests)} active request${display.activeRequests === 1 ? '' : 's'}`)),
  );
  const meta = element('div', 'rs-hero-meta');
  const modelMeta = element('div', 'rs-meta-item');
  modelMeta.append(element('span', 'rs-meta-label', 'Model'), element('strong', 'rs-meta-value', display.modelID ?? 'Not reported'));
  const sampleMeta = element('div', 'rs-meta-item');
  sampleMeta.append(element('span', 'rs-meta-label', stale ? 'Last sample' : 'Updated'), element('strong', 'rs-meta-value', formatAge(display.sampledAt)));
  meta.append(modelMeta, sampleMeta);
  reading.append(meta);
  heroGrid.append(reading, renderSignal(chartPhase));
  hero.append(heroTop, heroGrid);

  const kpis = element('div', 'rs-kpi-row');
  appendKPI(kpis, 'Context', ratioPercent(display.promptTokens, display.contextWindow), `${formatTokens(display.promptTokens)} of ${formatTokens(display.contextWindow)}`);
  appendKPI(kpis, 'Cache reuse', ratioPercent(display.cachedTokens, display.promptTokens), `${formatTokens(display.cachedTokens)} tokens reused`);
  appendKPI(kpis, 'Requests', stale ? '—' : formatNumber(display.activeRequests), stale ? 'last state unavailable' : display.queuedRequests > 0 ? `${formatNumber(display.queuedRequests)} queued` : 'queue clear');

  const panels = element('div', 'rs-panel-grid');
  panels.append(
    renderPanel('Runtime', [
      ['Phase', phaseLabel[statusPhase], phaseTone(statusPhase)],
      ['Live decode', formatTPS(liveStatus?.liveDecodeTPS ?? null), 'live'],
      ['Live prefill', formatTPS(liveStatus?.livePrefillTPS ?? null), 'live'],
      ['Elapsed', formatSeconds(liveStatus?.elapsedSeconds ?? null), ''],
      ['Scheduler', display.scheduler?.mode ?? '—', ''],
      ['Cache miss', display.sessionBank?.lastMissReason ?? '—', ''],
    ]),
    renderPanel('Resources', [
      ['Active memory', formatGB(display.memory?.activeGB ?? null), ''],
      ['Model memory', formatGB(display.memory?.modelGB ?? null), ''],
      ['KV cache', formatGB(display.memory?.cacheGB ?? null), ''],
      ['Pressure', display.memoryPressureLevel === null ? '—' : formatNumber(display.memoryPressureLevel), display.memoryPressureLevel !== null && display.memoryPressureLevel >= 2 ? 'warn' : ''],
      ['Hot entries', formatNumber(display.sessionBank?.hot?.entries ?? null), ''],
      ['Cold entries', formatNumber(display.sessionBank?.cold?.entries ?? null), ''],
    ]),
  );
  return [hero, kpis, panels, renderSession(display)];
};

const renderUnavailable = (snapshot: TelemetrySnapshot | null): HTMLElement => {
  const phase = snapshot?.phase ?? 'connecting';
  const card = element('section', 'rs-hero');
  const top = element('div', 'rs-hero-top');
  top.append(element('span', 'rs-overline', phase === 'connecting' ? 'Starting instrument' : 'Connection state'), renderPhase(phase));
  const reading = element('div', 'rs-reading');
  reading.append(
    element('div', 'rs-reading-value text', phaseLabel[phase]),
    element('div', 'rs-reading-unit', phase === 'connecting' ? 'approved local service' : 'local runtime'),
    element('p', `rs-reading-detail${snapshot?.reason === 'authentication_failed' ? ' rs-error' : ''}`, snapshot?.message ?? 'Starting the approved local telemetry service…'),
  );
  const note = element('p', 'rs-note', 'OMLX Scope reads local OpenCode/oMLX configuration and accepts only 127.0.0.1 HTTP endpoints. Credentials stay in the approved service and never enter the panel.');
  card.append(top, reading, note);
  return card;
};

const render = (): void => {
  const current = state.snapshot;
  const display = state.lastAvailable ?? (current?.available === true ? current : null);
  const liveStatus = current?.available === true ? current : null;
  serviceBadge.update({
    label: `Service ${state.serviceStatus}`,
    tone: state.serviceStatus === 'ready' ? 'success' : state.serviceStatus === 'failed' ? 'error' : 'neutral',
  });
  subtitle.textContent = display?.modelID ? `oMLX · ${display.modelID}` : 'oMLX · waiting for a sample';
  context.textContent = state.sessionTitle
    ? `${state.sessionTitle}${state.directory ? ` · ${state.directory}` : ''}`
    : state.directory ?? 'No project selected';
  refreshButton.update({ loading: state.pending });
  body.replaceChildren();

  if (display === null) {
    const reason = current?.reason;
    setNotice(reason === 'authentication_failed' ? 'Authentication required' : current?.available === false ? 'Runtime unavailable' : null, reason === 'authentication_failed' ? 'error' : 'warning');
    body.append(renderUnavailable(current));
    return;
  }

  if (liveStatus === null) {
    setNotice(`Last sample ${formatAge(display.sampledAt)} · ${current?.message ?? 'trying to reconnect'}`, 'warning');
  } else if (state.failures === 0) {
    setNotice(null);
  }
  body.append(...renderDashboard(display, liveStatus));
};

const sample = async (): Promise<void> => {
  if (state.pending) {
    state.refreshQueued = true;
    return;
  }
  state.pending = true;
  render();
  try {
    const result = await host.serviceRequest({ method: 'GET', path: '/snapshot' });
    let payload: unknown = null;
    try {
      payload = JSON.parse(result.body);
    } catch {
      payload = null;
    }
    const parsed = parseTelemetrySnapshot(payload);
    state.snapshot = parsed;
    if (parsed.available) {
      state.lastAvailable = parsed;
      recordSignal(parsed);
      state.failures = 0;
    } else {
      state.failures += 1;
    }
  } catch (error) {
    state.failures += 1;
    const message = error instanceof HostRequestError
      ? `${error.code}: ${error.message}`
      : 'The OpenChamber service request failed.';
    state.snapshot = unavailableTelemetry('runtime_unreachable', message);
  }
  state.pending = false;
  await updateServiceStatus();
  render();
  if (state.refreshQueued) {
    state.refreshQueued = false;
    void sample();
    return;
  }
  const delay = nextDelay(state.lastAvailable, state.failures);
  state.timer = window.setTimeout(() => {
    state.timer = null;
    void sample();
  }, delay);
};

let mounted = false;
host.onReady((ready) => {
  applyHostReady(ready, document.documentElement);
  if (mounted) return;
  mounted = true;
  state.directory = ready.directory;
  state.sessionTitle = ready.session?.title ?? null;
  host.onDirectory((directory) => { state.directory = directory; render(); });
  host.onSession((session) => { state.sessionTitle = session?.title ?? null; render(); });
  void updateServiceStatus().then(() => { render(); void sample(); });
});

window.addEventListener('pagehide', () => {
  if (state.timer !== null) window.clearTimeout(state.timer);
  host.dispose();
});
