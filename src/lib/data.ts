import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import type { Officer } from '../components/OfficerRow.astro';
import type { TimelineEvent } from '../components/Timeline.astro';

export interface Virtue {
  title: string;
  lead: string;
  body: string;
  practice: string;
  mobile_height: number;
}

function loadYaml<T>(file: string): T {
  const p = path.resolve(process.cwd(), 'src/data', file);
  return yaml.load(fs.readFileSync(p, 'utf8')) as T;
}

export const officers = loadYaml<Officer[]>('officers.yaml');
export const events = loadYaml<TimelineEvent[]>('events.yaml');
export const virtues = loadYaml<Virtue[]>('virtues.yaml');
