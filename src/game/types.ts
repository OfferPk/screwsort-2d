/** ScrewSort 2D — types (NOT TubeSort / HexPour / 3D). */

export type ScrewColor = 'R' | 'B' | 'G' | 'Y' | 'P' | 'O';

export interface ScrewDef {
  id: string;
  x: number;
  y: number;
  z: number;
  color: ScrewColor;
}

/** covers: [covererId, coveredId] — coverer blocks covered until removed. */
export interface LevelDef {
  id: number;
  dockSize: number;
  matchSize: number;
  screws: ScrewDef[];
  covers: [string, string][];
}

export interface ScrewState extends ScrewDef {}

export interface DockItem {
  id: string;
  color: ScrewColor;
}

export type PlayStatus = 'playing' | 'won' | 'failed';

export interface GameState {
  levelId: number;
  dockSize: number;
  matchSize: number;
  screws: ScrewState[];
  covers: [string, string][];
  dock: DockItem[];
  status: PlayStatus;
}

export const SCREW_RADIUS = 22;
export const BOARD_W = 360;
export const BOARD_H = 420;

export const COLOR_HEX: Record<ScrewColor, string> = {
  R: '#e85d5d',
  B: '#4aa3ff',
  G: '#3ecf8e',
  Y: '#f5c542',
  P: '#c47bff',
  O: '#ff8c42',
};
