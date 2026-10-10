import type { TripsRepository } from "../repositories";
import type { TripRecord } from "../types";
import { getStore } from "./store";
import {
  cloneRecord,
  compareTrips,
  completeStoredTrip,
  copyBytes,
  createStoredTrip,
  patchStoredTrip,
  type StoredTrip,
} from "./trip-model";

/** Viagem do usuário (viagem de outro usuário = não existe). */
function owned(userId: string, id: string): StoredTrip | undefined {
  const stored = getStore().trips.get(id);
  return stored && stored.record.userId === userId ? stored : undefined;
}

export const memoryTrips: TripsRepository = {
  async list(userId, status) {
    // `order` = ordem de inserção: o Postgres guarda microssegundos, o JS só milissegundos —
    // dois registros criados no mesmo ms seriam um empate; o mais novo vem primeiro, como lá.
    const entries: Array<{ record: TripRecord; order: number }> = [];
    let order = 0;
    for (const { record } of getStore().trips.values()) {
      if (record.userId === userId && (!status || record.status === status)) {
        entries.push({ record, order: order++ });
      }
    }
    return entries
      .sort((a, b) => compareTrips(a.record, b.record) || b.order - a.order)
      .map(({ record }) => cloneRecord(record));
  },

  async find(userId, id) {
    const stored = owned(userId, id);
    return stored ? cloneRecord(stored.record) : null;
  },

  async create(userId, trip) {
    // Copia na escrita: quem chamou não mantém referência ao que ficou guardado.
    const { cover, ...fields } = trip;
    const stored = createStoredTrip(userId, { ...structuredClone(fields), cover });
    getStore().trips.set(stored.record.id, stored);
    return cloneRecord(stored.record);
  },

  async update(userId, id, patch) {
    const stored = owned(userId, id);
    if (!stored) return null;
    const { cover, ...fields } = patch;
    patchStoredTrip(stored, { ...structuredClone(fields), cover });
    return cloneRecord(stored.record);
  },

  async remove(userId, id) {
    return owned(userId, id) ? getStore().trips.delete(id) : false;
  },

  async complete(userId, items) {
    // Tudo ou nada: confere todas antes de alterar qualquer uma.
    const targets = items.map((item) => owned(userId, item.id));
    if (targets.some((stored) => stored === undefined)) return null;

    items.forEach((item, index) =>
      completeStoredTrip(targets[index] as StoredTrip, structuredClone(item.report)),
    );
    return targets.map((stored) => cloneRecord((stored as StoredTrip).record));
  },

  async getCover(userId, id) {
    const stored = owned(userId, id);
    return stored?.cover ? copyBytes(stored.cover) : null;
  },

  async stats(userId) {
    const cities = new Set<string>();
    const countries = new Set<string>();
    let completedTrips = 0;
    let plannedTrips = 0;

    for (const { record } of getStore().trips.values()) {
      if (record.userId !== userId) continue;
      if (record.status === "planejada") {
        plannedTrips++;
        continue;
      }
      completedTrips++;
      cities.add((record.city ?? record.destination).toLowerCase());
      if (record.countryCode !== null) countries.add(record.countryCode);
    }
    return { cities: cities.size, countries: countries.size, completedTrips, plannedTrips };
  },
};
