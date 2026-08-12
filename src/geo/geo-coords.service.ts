import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolveFallbackCoords } from "../document-guide/map-pin-coords";

type Coords = { lat: number; lng: number };

type CountryJson = {
  id: number;
  name: string;
  latitude?: string;
  longitude?: string;
  states?: Array<{
    cities?: Array<{
      id: number;
      latitude?: string;
      longitude?: string;
    }>;
  }>;
};

export type GeoTagRef = {
  countryId: number | null;
  cityId: number | null;
};

function parseCoord(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class GeoCoordsService {
  private readonly logger = new Logger(GeoCoordsService.name);
  private countryById = new Map<number, Coords>();
  private cityById = new Map<number, Coords>();
  private indexLoaded = false;
  private indexLoadFailed = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Resolve coords from geo JSON / name fallback and persist when missing in DB. */
  async ensureCountryCoords(countryId: number): Promise<void> {
    const country = await this.prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true, name: true, latitude: true, longitude: true },
    });
    if (!country) return;
    if (country.latitude != null && country.longitude != null) return;

    const coords =
      this.lookupCountryFromIndex(country.id) ??
      resolveFallbackCoords(country.name);
    if (!coords) return;

    await this.prisma.country.update({
      where: { id: country.id },
      data: { latitude: coords.lat, longitude: coords.lng },
    });
  }

  /** Resolve coords from geo JSON / name fallback and persist when missing in DB. */
  async ensureCityCoords(cityId: number): Promise<void> {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        country: { select: { name: true } },
      },
    });
    if (!city) return;
    if (city.latitude != null && city.longitude != null) return;

    const coords =
      this.lookupCityFromIndex(city.id) ??
      resolveFallbackCoords(city.name, city.country.name);
    if (!coords) return;

    await this.prisma.city.update({
      where: { id: city.id },
      data: { latitude: coords.lat, longitude: coords.lng },
    });
  }

  async ensureCoordsForTagRefs(refs: GeoTagRef[]): Promise<void> {
    const countryIds = new Set<number>();
    const cityIds = new Set<number>();

    for (const ref of refs) {
      if (ref.cityId != null) cityIds.add(ref.cityId);
      if (ref.countryId != null) countryIds.add(ref.countryId);
    }

    await Promise.all([
      ...[...countryIds].map((id) => this.ensureCountryCoords(id)),
      ...[...cityIds].map((id) => this.ensureCityCoords(id)),
    ]);
  }

  private lookupCountryFromIndex(countryId: number): Coords | null {
    this.loadIndex();
    return this.countryById.get(countryId) ?? null;
  }

  private lookupCityFromIndex(cityId: number): Coords | null {
    this.loadIndex();
    return this.cityById.get(cityId) ?? null;
  }

  private loadIndex(): void {
    if (this.indexLoaded || this.indexLoadFailed) return;

    const jsonPath = path.resolve(
      process.cwd(),
      "countries+states+cities.json",
    );

    if (!fs.existsSync(jsonPath)) {
      this.logger.warn(
        `Geo coords index skipped: file not found at ${jsonPath}`,
      );
      this.indexLoadFailed = true;
      return;
    }

    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      const parsed = JSON.parse(raw) as CountryJson[];

      for (const country of parsed) {
        if (typeof country.id !== "number" || !Number.isFinite(country.id)) {
          continue;
        }
        const lat = parseCoord(country.latitude);
        const lng = parseCoord(country.longitude);
        if (lat != null && lng != null) {
          this.countryById.set(country.id, { lat, lng });
        }

        for (const state of country.states ?? []) {
          for (const city of state.cities ?? []) {
            if (typeof city.id !== "number" || !Number.isFinite(city.id)) {
              continue;
            }
            const cityLat = parseCoord(city.latitude);
            const cityLng = parseCoord(city.longitude);
            if (cityLat != null && cityLng != null) {
              this.cityById.set(city.id, { lat: cityLat, lng: cityLng });
            }
          }
        }
      }

      this.logger.log(
        `Geo coords index loaded (${this.countryById.size} countries, ${this.cityById.size} cities).`,
      );
    } catch (err) {
      this.logger.error("Failed to load geo coords index", err);
      this.indexLoadFailed = true;
    } finally {
      this.indexLoaded = true;
    }
  }
}
