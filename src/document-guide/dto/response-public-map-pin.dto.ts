import { buildPublicCoverImageUrl } from "../document-guide.storage";

export type PublicMapPinGuideDto = {
  id: string;
  title: string;
  tripDays: number | null;
  coverUrl: string | null;
};

export type PublicMapPinDto = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: "city" | "country";
  guideCount: number;
  guides: PublicMapPinGuideDto[];
};
