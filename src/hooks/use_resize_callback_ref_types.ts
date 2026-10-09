export interface Dimensions {
  width: number;
  height: number;
}

export type ResizeCallback = (dimensions: Dimensions, element: HTMLElement) => void;
