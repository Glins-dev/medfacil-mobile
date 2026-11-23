export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SpecialtyCatalogItem {
  id: string;
  name: string;
  description: string | null;
}

export interface RawSpecialtyRecord {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  nome?: unknown;
  description?: unknown;
  descricao?: unknown;
}

export type HospitalSpecialtyRef = string | RawSpecialtyRecord;

export interface ResolvedSpecialty {
  id: string;
  name: string;
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

// Normaliza registros de especialidade vindos da API (id/_id, name/nome, description/descricao).
export function normalizeSpecialty(
  raw: RawSpecialtyRecord | null | undefined
): SpecialtyCatalogItem | null {
  if (!raw || typeof raw !== "object") return null;

  const rawId = raw.id ?? raw._id;
  const id =
    typeof rawId === "string" || typeof rawId === "number"
      ? String(rawId).trim()
      : "";

  const rawName = raw.name ?? raw.nome;
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!id || !name || isUuid(name)) {
    return null;
  }

  const rawDesc = raw.description ?? raw.descricao;
  const description =
    typeof rawDesc === "string" && rawDesc.trim() ? rawDesc.trim() : null;

  return { id, name, description };
}

// Resolve IDs de especialidades de um hospital para nomes legiveis, sem exibir UUIDs brutos.
export function resolveHospitalSpecialties(
  specialtyIds: HospitalSpecialtyRef[] | null | undefined,
  specialties: Array<SpecialtyCatalogItem | RawSpecialtyRecord> | null | undefined,
  fallbackNamesById?: Record<string, string> | null
): ResolvedSpecialty[] {
  if (!Array.isArray(specialtyIds) || specialtyIds.length === 0) {
    return [];
  }

  const byId = new Map<string, ResolvedSpecialty>();
  const byName = new Map<string, ResolvedSpecialty>();

  if (Array.isArray(specialties)) {
    for (const raw of specialties) {
      const normalized = normalizeSpecialty(raw);
      if (!normalized) continue;
      const item: ResolvedSpecialty = {
        id: normalized.id,
        name: normalized.name,
      };
      byId.set(normalized.id.toLowerCase(), item);
      byName.set(normalized.name.toLowerCase(), item);
    }
  }

  if (fallbackNamesById && typeof fallbackNamesById === "object") {
    for (const [rawKey, rawName] of Object.entries(fallbackNamesById)) {
      const id = rawKey.trim();
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (!id || !name || isUuid(name)) continue;
      const lowerId = id.toLowerCase();
      if (!byId.has(lowerId)) {
        const fallbackItem: ResolvedSpecialty = { id, name };
        byId.set(lowerId, fallbackItem);
        if (!byName.has(name.toLowerCase())) {
          byName.set(name.toLowerCase(), fallbackItem);
        }
      }
    }
  }

  const resolved: ResolvedSpecialty[] = [];
  const seenNames = new Set<string>();

  const pushUnique = (item: ResolvedSpecialty) => {
    const cleanName = item.name.trim();
    if (!cleanName || isUuid(cleanName)) return;
    const key = cleanName.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    resolved.push({ id: item.id.trim() || cleanName, name: cleanName });
  };

  for (const entry of specialtyIds) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();
      const matchById = byId.get(lower);
      if (matchById) {
        pushUnique(matchById);
        continue;
      }

      const matchByName = byName.get(lower);
      if (matchByName) {
        pushUnique(matchByName);
        continue;
      }

      // Nunca retorna um UUID sem correspondencia para a camada de exibicao.
      if (!isUuid(trimmed)) {
        pushUnique({ id: trimmed, name: trimmed });
      }
      continue;
    }

    if (entry && typeof entry === "object") {
      const rawObjId = entry.id ?? entry._id;
      const objId =
        typeof rawObjId === "string" || typeof rawObjId === "number"
          ? String(rawObjId).trim()
          : "";
      const matchById = objId ? byId.get(objId.toLowerCase()) : undefined;
      if (matchById) {
        pushUnique(matchById);
        continue;
      }

      const rawObjName = entry.name ?? entry.nome;
      const objName = typeof rawObjName === "string" ? rawObjName.trim() : "";
      if (objName && !isUuid(objName)) {
        pushUnique({ id: objId || objName, name: objName });
      }
    }
  }

  return resolved.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

// Filtra e normaliza specialtyIds antes de persistir um hospital, removendo IDs orfaos quando o catalogo esta carregado.
export function sanitizeHospitalSpecialtyIds(
  specialtyIds: string[],
  specialties: SpecialtyCatalogItem[]
): string[] {
  const byLowerId = new Map<string, string>();
  for (const spec of specialties) {
    const id = spec.id.trim();
    if (id) {
      byLowerId.set(id.toLowerCase(), id);
    }
  }

  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const rawId of specialtyIds) {
    const trimmed = rawId.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (byLowerId.size > 0) {
      const canonical = byLowerId.get(lower);
      if (!canonical || seen.has(canonical.toLowerCase())) continue;
      seen.add(canonical.toLowerCase());
      sanitized.push(canonical);
    } else if (!seen.has(lower)) {
      seen.add(lower);
      sanitized.push(trimmed);
    }
  }

  return sanitized;
}
