import { describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => {
  const storage = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  };
});

import { useAdminStore } from "@/stores/admin.store";
import {
  normalizeSpecialty,
  resolveHospitalSpecialties,
  sanitizeHospitalSpecialtyIds,
  UUID_REGEX,
} from "@/utils/specialties";

describe("resolveHospitalSpecialties", () => {
  const uuidCardio = "3ff06eea-f28b-43e9-8de2-220a3e5f946d";
  const uuidOrphan = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
  const uuidPediatria = "11111111-2222-4333-8444-555555555555";

  const catalog = [
    { id: uuidPediatria, name: "Pediatria", description: null },
    { id: uuidCardio, name: "Cardiologia", description: "Coração" },
  ];

  it("converte UUIDs validos para os nomes cadastrados e ordena alfabeticamente em pt-BR", () => {
    const resolved = resolveHospitalSpecialties(
      [uuidPediatria, ` ${uuidCardio.toUpperCase()} `],
      catalog
    );

    expect(resolved).toEqual([
      { id: uuidCardio, name: "Cardiologia" },
      { id: uuidPediatria, name: "Pediatria" },
    ]);
  });

  it("filtra UUIDs orfaos ou desconhecidos sem exibir codigos UUID brutos", () => {
    const resolved = resolveHospitalSpecialties(
      [uuidCardio, uuidOrphan],
      [{ id: uuidCardio, name: "Cardiologia", description: null }]
    );

    expect(resolved).toEqual([{ id: uuidCardio, name: "Cardiologia" }]);
    for (const item of resolved) {
      expect(UUID_REGEX.test(item.name)).toBe(false);
    }

    const onlyOrphan = resolveHospitalSpecialties([uuidCardio], []);
    expect(onlyOrphan).toEqual([]);
  });

  it("remove duplicatas e aceita objetos ou campos nome/_id normalizados", () => {
    const fromBackend = normalizeSpecialty({
      _id: uuidCardio,
      nome: "Cardiologia",
      descricao: "Atendimento cardiaco",
    });
    expect(fromBackend).toEqual({
      id: uuidCardio,
      name: "Cardiologia",
      description: "Atendimento cardiaco",
    });

    const resolved = resolveHospitalSpecialties(
      [
        uuidCardio,
        uuidCardio.toUpperCase(),
        "Cardiologia",
        { id: uuidPediatria, nome: "Pediatria" },
      ],
      catalog
    );

    expect(resolved).toEqual([
      { id: uuidCardio, name: "Cardiologia" },
      { id: uuidPediatria, name: "Pediatria" },
    ]);
  });

  it("usa fallbackNamesById quando a lista remota ainda nao possui uma especialidade, ignorando fallbacks UUID", () => {
    const resolved = resolveHospitalSpecialties(
      [uuidCardio, uuidOrphan],
      [],
      {
        [uuidCardio]: "Cardiologia",
        [uuidOrphan]: uuidOrphan,
      }
    );

    expect(resolved).toEqual([{ id: uuidCardio, name: "Cardiologia" }]);
  });

  it("sanitiza specialtyIds removendo orfaos quando o catalogo esta disponivel", () => {
    const cleaned = sanitizeHospitalSpecialtyIds(
      [uuidCardio, uuidOrphan, uuidCardio.toUpperCase()],
      catalog
    );
    expect(cleaned).toEqual([uuidCardio]);
  });
});

describe("useAdminStore sincronizacao de especialidades e hospitais", () => {
  it("preserva especialidades administrativas apos sync parcial do catalogo e mantem fallback no hospital", () => {
    const store = useAdminStore.getState();
    store.resetLocalAdminData();

    const adminSpecId = "3ff06eea-f28b-43e9-8de2-220a3e5f946d";
    const catalogSpecId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    store.syncSpecialties([
      { id: adminSpecId, name: "Ortopedia", description: null },
    ]);

    store.addHospital({
      id: "hosp-1",
      name: "Hospital Recife",
      address: "Av. Boa Viagem, 100",
      specialtyIds: [adminSpecId],
      doctorIds: [],
    });

    // Catalogo do perfil medico retorna apenas especialidades que ja possuem medico ativo.
    store.syncSpecialties([
      { _id: catalogSpecId, nome: "Clínica Médica", descricao: null },
    ]);

    const state = useAdminStore.getState();
    expect(state.specialties.map((s) => s.id)).toContain(adminSpecId);
    expect(state.specialties.map((s) => s.id)).toContain(catalogSpecId);
    expect(state.hospitals[0]?.specialtyNamesById?.[adminSpecId]).toBe(
      "Ortopedia"
    );

    const resolved = resolveHospitalSpecialties(
      state.hospitals[0]?.specialtyIds,
      state.specialties,
      state.hospitals[0]?.specialtyNamesById
    );
    expect(resolved).toEqual([{ id: adminSpecId, name: "Ortopedia" }]);

    store.resetLocalAdminData();
  });
});
