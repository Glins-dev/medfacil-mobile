import { beforeEach, describe, expect, it, vi } from "vitest";

const { alertMock, openUrlMock } = vi.hoisted(() => ({
  alertMock: vi.fn(),
  openUrlMock: vi.fn(),
}));

vi.mock("react-native", () => ({
  Alert: { alert: alertMock },
  Linking: { openURL: openUrlMock },
}));

import {
  buildGoogleMapsRouteUrl,
  formatRouteDestination,
  openBestRoute,
} from "@/utils/maps";

describe("formatRouteDestination", () => {
  it("combina nome da unidade e endereco sem duplicacao", () => {
    expect(
      formatRouteDestination(
        "Hospital Esperança",
        "Rua Antônio Gomes de Freitas, 265, Ilha do Leite, Recife, PE"
      )
    ).toBe(
      "Hospital Esperança, Rua Antônio Gomes de Freitas, 265, Ilha do Leite, Recife, PE"
    );

    expect(
      formatRouteDestination(
        "Clínica MedFácil",
        "Clínica MedFácil, Boa Vista, Recife"
      )
    ).toBe("Clínica MedFácil, Boa Vista, Recife");
  });
});

describe("buildGoogleMapsRouteUrl", () => {
  it("monta URL oficial com origin e destination codificados corretamente", () => {
    const url = buildGoogleMapsRouteUrl({
      originAddress: "Rua das Flores, 123, Boa Vista, Recife, PE",
      destinationName: "Hospital Esperança",
      destinationAddress: "Rua Antônio Gomes de Freitas, 265, Recife, PE",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.google.com/maps/dir/"
    );
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.get("origin")).toBe(
      "Rua das Flores, 123, Boa Vista, Recife, PE"
    );
    expect(parsed.searchParams.get("destination")).toBe(
      "Hospital Esperança, Rua Antônio Gomes de Freitas, 265, Recife, PE"
    );
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
    expect(url).toContain("origin=Rua%20das%20Flores%2C%20123");
    expect(url).toContain("Hospital%20Esperan%C3%A7a");
  });

  it("omite o parametro origin quando o endereco do paciente esta ausente ou vazio", () => {
    const withoutOrigin = buildGoogleMapsRouteUrl({
      originAddress: "   ",
      destinationName: "Clínica MedFácil",
      destinationAddress: "Boa Vista, Recife",
    });

    expect(withoutOrigin).not.toBeNull();
    const parsed = new URL(withoutOrigin as string);
    expect(parsed.searchParams.has("origin")).toBe(false);
    expect(parsed.searchParams.get("destination")).toBe(
      "Clínica MedFácil, Boa Vista, Recife"
    );

    const nullOrigin = buildGoogleMapsRouteUrl({
      originAddress: null,
      destinationAddress: "Av. Agamenon Magalhães, 2291",
    });
    expect(nullOrigin).toContain("destination=Av.%20Agamenon");
    expect(nullOrigin).not.toContain("origin=");
  });

  it("retorna null quando o endereco de destino e o nome estiverem vazios", () => {
    expect(
      buildGoogleMapsRouteUrl({
        originAddress: "Rua das Flores, 123, Recife",
        destinationAddress: "   ",
        destinationName: "",
      })
    ).toBeNull();
  });
});

describe("openBestRoute", () => {
  beforeEach(() => {
    alertMock.mockReset();
    openUrlMock.mockReset();
  });

  it("abre o Google Maps via Linking.openURL quando o destino e valido", async () => {
    openUrlMock.mockResolvedValueOnce(undefined);

    const opened = await openBestRoute({
      originAddress: "Rua das Flores, 123, Boa Vista, Recife, PE",
      destinationName: "Clínica MedFácil",
      destinationAddress: "Boa Vista, Recife",
    });

    expect(opened).toBe(true);
    expect(openUrlMock).toHaveBeenCalledTimes(1);
    expect(openUrlMock.mock.calls[0]?.[0]).toContain(
      "https://www.google.com/maps/dir/?api=1"
    );
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("exibe alerta claro quando o destino esta vazio ou ocorre erro ao abrir", async () => {
    const noDest = await openBestRoute({
      originAddress: "Rua das Flores, 123, Recife",
      destinationAddress: "",
    });
    expect(noDest).toBe(false);
    expect(openUrlMock).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith(
      "Endereço indisponível",
      expect.any(String)
    );

    alertMock.mockReset();
    openUrlMock.mockRejectedValueOnce(new Error("Cannot open URL"));
    const failedOpen = await openBestRoute({
      destinationAddress: "Boa Vista, Recife",
    });
    expect(failedOpen).toBe(false);
    expect(alertMock).toHaveBeenCalledWith(
      "Não foi possível abrir o mapa",
      expect.any(String)
    );
  });
});
