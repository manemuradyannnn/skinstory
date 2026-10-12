import { regionById, regionPercent } from "../lib/regions";
import type { Concern } from "../types";

function placed(regionId: string) {
  const region = regionById(regionId);
  return { region, ...regionPercent(region) };
}

const forearm = placed("left-forearm");
const upperBack = placed("upper-back-right");
const cheek = placed("right-cheek");

export const SAMPLE_CONCERNS: Concern[] = [
  {
    id: "sample-forearm",
    name: "Left forearm",
    regionId: forearm.region.id,
    regionLabel: forearm.region.label,
    view: forearm.region.view,
    x: forearm.x,
    y: forearm.y,
    sample: true,
    observations: [
      {
        id: "sample-forearm-1",
        date: "2026-06-14",
        photoSrc: "/samples/forearm-1.svg",
        photoKind: "sample",
        symptoms: ["itching"],
        notes:
          "A small oval mark on the inner forearm. I noticed it after a week of strong sun and photographed it by the kitchen window.",
        createdAt: "2026-06-14T09:10:00.000Z",
      },
      {
        id: "sample-forearm-2",
        date: "2026-08-03",
        photoSrc: "/samples/forearm-2.svg",
        photoKind: "sample",
        symptoms: ["itching", "dryness"],
        notes:
          "It looks a little larger than in June, and the edge is less even. The skin around it feels dry. Same window, late afternoon.",
        createdAt: "2026-08-03T16:40:00.000Z",
      },
      {
        id: "sample-forearm-3",
        date: "2026-09-19",
        photoSrc: "/samples/forearm-3.svg",
        photoKind: "sample",
        symptoms: ["itching"],
        notes:
          "Similar to August. The dryness has eased. I tried to match the earlier distance and included some surrounding skin.",
        createdAt: "2026-09-19T08:25:00.000Z",
      },
    ],
  },
  {
    id: "sample-back",
    name: "Right upper back",
    regionId: upperBack.region.id,
    regionLabel: upperBack.region.label,
    view: upperBack.region.view,
    x: upperBack.x,
    y: upperBack.y,
    sample: true,
    observations: [
      {
        id: "sample-back-1",
        date: "2026-05-02",
        photoSrc: "/samples/back-1.svg",
        photoKind: "sample",
        symptoms: ["none"],
        notes:
          "A round spot near the right shoulder blade. It is hard to see without a mirror, so this photo was taken by someone else.",
        createdAt: "2026-05-02T11:05:00.000Z",
      },
      {
        id: "sample-back-2",
        date: "2026-09-28",
        photoSrc: "/samples/back-2.svg",
        photoKind: "sample",
        symptoms: ["tenderness"],
        notes:
          "Taken closer than the May photo, and a little off centre. It looks about the same size. Tender if I press it.",
        createdAt: "2026-09-28T19:15:00.000Z",
      },
    ],
  },
  {
    id: "sample-cheek",
    name: "Right cheek",
    regionId: cheek.region.id,
    regionLabel: cheek.region.label,
    view: cheek.region.view,
    x: cheek.x,
    y: cheek.y,
    sample: true,
    observations: [
      {
        id: "sample-cheek-1",
        date: "2026-10-04",
        photoSrc: "/samples/cheek-1.svg",
        photoKind: "sample",
        symptoms: ["dryness"],
        notes:
          "A faint patch on the right cheek. More noticeable after washing my face. No itching today.",
        createdAt: "2026-10-04T07:50:00.000Z",
      },
    ],
  },
];

export function allObservationIds(concerns: Concern[]): string[] {
  return concerns.flatMap((concern) => concern.observations.map((observation) => observation.id));
}
