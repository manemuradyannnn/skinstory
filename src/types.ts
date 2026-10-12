export type BodyView = "front" | "back";

export type SymptomId = "itching" | "tenderness" | "dryness" | "bleeding" | "none";

export type PhotoKind = "sample" | "demo" | "upload";

export type Observation = {
  id: string;
  date: string;
  photoSrc: string;
  photoKind: PhotoKind;
  photoName?: string;
  symptoms: SymptomId[];
  notes: string;
  createdAt: string;
};

export type Concern = {
  id: string;
  name: string;
  regionId: string;
  regionLabel: string;
  view: BodyView;
  x: number;
  y: number;
  sample: boolean;
  observations: Observation[];
};

export type Question = {
  id: string;
  text: string;
  included: boolean;
};

export type Toast = {
  id: number;
  message: string;
};
